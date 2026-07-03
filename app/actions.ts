"use server";

import { SessionStage } from "@prisma/client";
import { GroupRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, signIn, signOut } from "@/lib/auth";
import { canMoveSessionStage, defaultPlanMarkdown, defaultSparkFields, mergeSparkFields, parseSparkFields } from "@/lib/domain";
import { validateRegistrationInvite } from "@/lib/invite";
import { callLlm, generateSparkFields } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { requireGroupMember } from "@/lib/permissions";
import { makeInviteCode, slugify } from "@/lib/slug";
import { createPhotoUploadUrl } from "@/lib/storage";

const signupSchema = z.object({
  name: z.string().min(2, "请填写昵称"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
  inviteCode: z.string().min(1, "请填写邀请码")
});

const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位")
});

const llmConfigSchema = z.object({
  apiKey: z.string().min(1, "API Key 不能为空"),
  baseUrl: z.string().url("请输入有效的 URL"),
  model: z.string().min(1, "模型名称不能为空"),
  temperature: z.coerce.number().min(0, "Temperature 不能小于 0").max(2, "Temperature 不能大于 2"),
  maxTokens: z.coerce.number().int("Max Tokens 必须是整数").min(1).max(128000)
});

const skillSchema = z.object({
  name: z.string().min(1, "Skill 名称不能为空").max(50, "Skill 名称最多 50 个字符"),
  description: z.string().max(200, "描述最多 200 个字符"),
  systemPrompt: z.string().min(10, "System Prompt 至少 10 个字符").max(2000, "System Prompt 最多 2000 个字符"),
  fieldHints: z.record(z.string(), z.string()),
  isDefault: z.boolean()
});

const createSessionWithAiSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题最多 100 个字符"),
  description: z.string().max(2000, "描述最多 2000 字"),
  skillId: z.string(),
  useAi: z.boolean()
});

type ActionState = { ok?: boolean; error?: string; message?: string };

async function currentUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user.id;
}

async function requireGroupOwner(userId: string, groupId: string) {
  await requireGroupMember(userId, groupId);
  const membership = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId
      }
    },
    select: { role: true }
  });

  if (membership?.role !== GroupRole.OWNER) {
    return false;
  }

  return true;
}

function parseFieldHintsInput(value: FormDataEntryValue | null): Record<string, string> | { error: string } {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    const result = z.record(z.string(), z.string()).safeParse(parsed);
    if (!result.success) {
      return { error: "fieldHints 必须是字符串键值的 JSON 对象" };
    }
    return result.data;
  } catch {
    return { error: "fieldHints 必须是合法的 JSON" };
  }
}

function isActionError(value: Record<string, string> | { error: string }): value is { error: string } {
  return "error" in value;
}

function normalizeFieldHints(value: unknown): Record<string, string> {
  const parsed = z.record(z.string(), z.string()).safeParse(value);
  return parsed.success ? parsed.data : {};
}

export async function signupAction(_state: { error?: string } | undefined, formData: FormData) {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "注册信息不完整" };
  }

  if (!validateRegistrationInvite(parsed.data.inviteCode)) {
    return { error: "邀请码不正确" };
  }

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { error: "这个邮箱已经注册过" };
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12)
    }
  });

  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo: "/app/groups"
  });
}

export async function loginAction(_state: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "登录信息不完整" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/app/groups"
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "邮箱或密码不正确" };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createGroupAction(formData: FormData) {
  const userId = await currentUserId();
  const name = z.string().min(2).parse(formData.get("name"));
  const slugBase = slugify(name);
  const slug = `${slugBase}-${makeInviteCode().toLowerCase()}`;

  const group = await prisma.group.create({
    data: {
      name,
      slug,
      inviteCode: makeInviteCode(),
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "OWNER"
        }
      }
    }
  });

  redirect(`/app/groups/${group.id}`);
}

export async function joinGroupAction(formData: FormData) {
  const userId = await currentUserId();
  const inviteCode = z.string().min(4).parse(formData.get("inviteCode")).trim().toUpperCase();
  const group = await prisma.group.findUnique({ where: { inviteCode } });
  if (!group) {
    redirect("/app/groups?error=invalid-invite");
  }

  await prisma.groupMember.upsert({
    where: {
      userId_groupId: {
        userId,
        groupId: group.id
      }
    },
    create: {
      userId,
      groupId: group.id,
      role: "MEMBER"
    },
    update: {}
  });

  redirect(`/app/groups/${group.id}`);
}

export async function deleteGroupAction(groupId: string): Promise<ActionState> {
  const userId = await currentUserId();
  if (!(await requireGroupOwner(userId, groupId))) {
    return { error: "只有群组 OWNER 可以删除小组" };
  }

  await prisma.group.delete({
    where: { id: groupId }
  });

  revalidatePath("/app/groups");
  return { ok: true, message: "小组已删除" };
}

export async function createSessionAction(groupId: string, formData: FormData) {
  const userId = await currentUserId();
  await requireGroupMember(userId, groupId);

  const title = z.string().min(2).parse(formData.get("title"));

  const session = await prisma.session.create({
    data: {
      groupId,
      title,
      sparkFields: defaultSparkFields,
      planMarkdown: defaultPlanMarkdown,
      updatedById: userId
    }
  });

  revalidatePath(`/app/groups/${groupId}`);
  redirect(`/app/groups/${groupId}/sessions/${session.id}`);
}

export async function saveLlmConfigAction(groupId: string, _state: ActionState | null, formData: FormData): Promise<ActionState> {
  const userId = await currentUserId();
  if (!(await requireGroupOwner(userId, groupId))) {
    return { error: "只有群组 OWNER 可以配置 LLM" };
  }

  const parsed = llmConfigSchema.safeParse({
    apiKey: formData.get("apiKey"),
    baseUrl: formData.get("baseUrl"),
    model: formData.get("model"),
    temperature: formData.get("temperature"),
    maxTokens: formData.get("maxTokens")
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "LLM 配置不完整" };
  }

  await prisma.llmConfig.upsert({
    where: { groupId },
    update: parsed.data,
    create: {
      groupId,
      ...parsed.data
    }
  });

  revalidatePath(`/app/groups/${groupId}`);
  return { ok: true, message: "LLM 配置已保存" };
}

export async function deleteLlmConfigAction(groupId: string): Promise<ActionState> {
  const userId = await currentUserId();
  if (!(await requireGroupOwner(userId, groupId))) {
    return { error: "只有群组 OWNER 可以删除 LLM 配置" };
  }

  await prisma.llmConfig.deleteMany({ where: { groupId } });
  revalidatePath(`/app/groups/${groupId}`);
  return { ok: true, message: "LLM 配置已删除" };
}

export async function testLlmConfigAction(groupId: string, _state: ActionState | null, formData: FormData): Promise<ActionState> {
  const userId = await currentUserId();
  if (!(await requireGroupOwner(userId, groupId))) {
    return { error: "只有群组 OWNER 可以测试 LLM 配置" };
  }

  const parsed = llmConfigSchema.pick({ apiKey: true, baseUrl: true, model: true }).safeParse({
    apiKey: formData.get("apiKey"),
    baseUrl: formData.get("baseUrl"),
    model: formData.get("model")
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "LLM 配置不完整" };
  }

  try {
    await callLlm(
      {
        ...parsed.data,
        temperature: 0.1,
        maxTokens: 50
      },
      "你是一个测试助手。",
      "请回复 JSON：{\"message\":\"连接成功\"}。"
    );
    return { ok: true, message: `连接成功，模型：${parsed.data.model}` };
  } catch (error) {
    return { error: `连接失败: ${error instanceof Error ? error.message : "未知错误"}` };
  }
}

export async function createSkillAction(groupId: string, _state: ActionState | null, formData: FormData): Promise<ActionState> {
  const userId = await currentUserId();
  if (!(await requireGroupOwner(userId, groupId))) {
    return { error: "只有群组 OWNER 可以创建 Skill" };
  }

  const fieldHints = parseFieldHintsInput(formData.get("fieldHints"));
  if (isActionError(fieldHints)) {
    return fieldHints;
  }

  const parsed = skillSchema.safeParse({
    name: formData.get("name"),
    description: String(formData.get("description") ?? ""),
    systemPrompt: formData.get("systemPrompt"),
    fieldHints,
    isDefault: formData.get("isDefault") === "on"
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Skill 信息不完整" };
  }

  if (parsed.data.isDefault) {
    await prisma.llmSkill.updateMany({
      where: { groupId, isDefault: true },
      data: { isDefault: false }
    });
  }

  await prisma.llmSkill.create({
    data: {
      groupId,
      ...parsed.data
    }
  });

  revalidatePath(`/app/groups/${groupId}`);
  return { ok: true, message: "Skill 已创建" };
}

export async function updateSkillAction(skillId: string, _state: ActionState | null, formData: FormData): Promise<ActionState> {
  const userId = await currentUserId();
  const skill = await prisma.llmSkill.findUnique({
    where: { id: skillId },
    select: { groupId: true }
  });
  if (!skill) {
    return { error: "Skill 不存在" };
  }
  if (!(await requireGroupOwner(userId, skill.groupId))) {
    return { error: "只有群组 OWNER 可以修改 Skill" };
  }

  const fieldHints = parseFieldHintsInput(formData.get("fieldHints"));
  if (isActionError(fieldHints)) {
    return fieldHints;
  }

  const parsed = skillSchema.safeParse({
    name: formData.get("name"),
    description: String(formData.get("description") ?? ""),
    systemPrompt: formData.get("systemPrompt"),
    fieldHints,
    isDefault: formData.get("isDefault") === "on"
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Skill 信息不完整" };
  }

  if (parsed.data.isDefault) {
    await prisma.llmSkill.updateMany({
      where: { groupId: skill.groupId, isDefault: true },
      data: { isDefault: false }
    });
  }

  await prisma.llmSkill.update({
    where: { id: skillId },
    data: parsed.data
  });

  revalidatePath(`/app/groups/${skill.groupId}`);
  return { ok: true, message: "Skill 已更新" };
}

export async function deleteSkillAction(skillId: string): Promise<ActionState> {
  const userId = await currentUserId();
  const skill = await prisma.llmSkill.findUnique({
    where: { id: skillId },
    select: { groupId: true }
  });
  if (!skill) {
    return { error: "Skill 不存在" };
  }
  if (!(await requireGroupOwner(userId, skill.groupId))) {
    return { error: "只有群组 OWNER 可以删除 Skill" };
  }

  await prisma.llmSkill.delete({ where: { id: skillId } });
  revalidatePath(`/app/groups/${skill.groupId}`);
  return { ok: true, message: "Skill 已删除" };
}

export async function createSessionWithAiAction(groupId: string, _state: ActionState | null, formData: FormData): Promise<ActionState | void> {
  const userId = await currentUserId();
  await requireGroupMember(userId, groupId);

  const parsed = createSessionWithAiSchema.safeParse({
    title: formData.get("title"),
    description: String(formData.get("description") ?? ""),
    skillId: String(formData.get("skillId") ?? ""),
    useAi: formData.get("useAi") === "on"
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Session 信息不完整" };
  }

  const llmConfig = await prisma.llmConfig.findUnique({ where: { groupId } });
  if (parsed.data.useAi && !llmConfig) {
    return { error: "群组未配置 LLM，请联系群组 OWNER 配置" };
  }

  let skillSystemPrompt: string | undefined;
  let fieldHints: Record<string, string> = {};
  let selectedSkillId: string | null = null;

  if (parsed.data.skillId) {
    const skill = await prisma.llmSkill.findFirst({
      where: {
        id: parsed.data.skillId,
        groupId
      },
      select: {
        id: true,
        systemPrompt: true,
        fieldHints: true
      }
    });
      if (skill) {
      selectedSkillId = skill.id;
      skillSystemPrompt = skill.systemPrompt;
      fieldHints = normalizeFieldHints(skill.fieldHints);
    }
  }

  let sparkFields = defaultSparkFields;
  let aiGenerated = false;
  let aiRawResponse = "";

  if (parsed.data.useAi && llmConfig && parsed.data.description.trim()) {
    try {
      const result = await generateSparkFields(
        {
          apiKey: llmConfig.apiKey,
          baseUrl: llmConfig.baseUrl,
          model: llmConfig.model,
          temperature: llmConfig.temperature,
          maxTokens: llmConfig.maxTokens
        },
        parsed.data.description,
        skillSystemPrompt,
        fieldHints
      );
      sparkFields = result.sparkFields;
      aiGenerated = true;
      aiRawResponse = result.rawResponse;
    } catch (error) {
      aiRawResponse = `ERROR: ${error instanceof Error ? error.message : "未知错误"}`;
    }
  }

  const session = await prisma.session.create({
    data: {
      groupId,
      title: parsed.data.title,
      description: parsed.data.description,
      skillId: selectedSkillId,
      sparkFields,
      planMarkdown: defaultPlanMarkdown,
      aiGenerated,
      aiRawResponse,
      updatedById: userId
    }
  });

  revalidatePath(`/app/groups/${groupId}`);
  redirect(`/app/groups/${groupId}/sessions/${session.id}`);
}

export async function regenerateSparkFieldsAction(sessionId: string): Promise<ActionState> {
  const userId = await currentUserId();
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      groupId: true,
      description: true,
      skillId: true
    }
  });
  if (!session) {
    return { error: "Session 不存在" };
  }

  await requireGroupMember(userId, session.groupId);
  if (!session.description.trim()) {
    return { error: "Session 没有描述内容，无法生成" };
  }

  const llmConfig = await prisma.llmConfig.findUnique({ where: { groupId: session.groupId } });
  if (!llmConfig) {
    return { error: "群组未配置 LLM" };
  }

  let skillSystemPrompt: string | undefined;
  let fieldHints: Record<string, string> = {};
  if (session.skillId) {
    const skill = await prisma.llmSkill.findFirst({
      where: {
        id: session.skillId,
        groupId: session.groupId
      },
      select: {
        systemPrompt: true,
        fieldHints: true
      }
    });
    if (skill) {
      skillSystemPrompt = skill.systemPrompt;
      fieldHints = normalizeFieldHints(skill.fieldHints);
    }
  }

  try {
    const result = await generateSparkFields(
      {
        apiKey: llmConfig.apiKey,
        baseUrl: llmConfig.baseUrl,
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens
      },
      session.description,
      skillSystemPrompt,
      fieldHints
    );

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        sparkFields: result.sparkFields,
        aiGenerated: true,
        aiRawResponse: result.rawResponse,
        updatedById: userId
      }
    });
  } catch (error) {
    return { error: `LLM 调用失败: ${error instanceof Error ? error.message : "未知错误"}` };
  }

  revalidatePath(`/app/groups/${session.groupId}/sessions/${sessionId}`);
  return { ok: true, message: "SPARK 字段已重新生成" };
}

export async function deleteSessionAction(sessionId: string) {
  const userId = await currentUserId();
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    select: { groupId: true }
  });

  await requireGroupMember(userId, session.groupId);

  await prisma.session.delete({
    where: { id: sessionId }
  });

  revalidatePath(`/app/groups/${session.groupId}`);
}

export async function updateSessionStageAction(sessionId: string, targetStage: SessionStage) {
  const userId = await currentUserId();
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    select: { id: true, groupId: true, stage: true }
  });

  await requireGroupMember(userId, session.groupId);

  if (!canMoveSessionStage(session.stage, targetStage)) {
    throw new Error("INVALID_STAGE_TRANSITION");
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      stage: targetStage,
      updatedById: userId
    }
  });

  revalidatePath(`/app/groups/${session.groupId}`);
  revalidatePath(`/app/groups/${session.groupId}/sessions/${sessionId}`);
}

export async function updateSparkAction(sessionId: string, formData: FormData) {
  const userId = await currentUserId();
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    select: { groupId: true, sparkFields: true }
  });

  await requireGroupMember(userId, session.groupId);
  const nextSparkFields = mergeSparkFields(parseSparkFields(session.sparkFields), formData);

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      sparkFields: nextSparkFields,
      updatedById: userId
    }
  });

  revalidatePath(`/app/groups/${session.groupId}/sessions/${sessionId}`);
}

export async function updatePlanAction(sessionId: string, formData: FormData) {
  const userId = await currentUserId();
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    select: { groupId: true }
  });

  await requireGroupMember(userId, session.groupId);

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      planMarkdown: String(formData.get("planMarkdown") ?? ""),
      updatedById: userId
    }
  });

  revalidatePath(`/app/groups/${session.groupId}/sessions/${sessionId}`);
}

export async function createPhotoUploadAction(sessionId: string, formData: FormData) {
  const userId = await currentUserId();
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    select: { groupId: true }
  });

  await requireGroupMember(userId, session.groupId);

  const fileName = z.string().min(1).parse(formData.get("fileName"));
  const contentType = z.string().min(1).parse(formData.get("contentType"));
  const objectKey = `sessions/${sessionId}/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const uploadUrl = await createPhotoUploadUrl(objectKey, contentType);

  return { uploadUrl, objectKey };
}

export async function registerPhotoAction(sessionId: string, formData: FormData) {
  const userId = await currentUserId();
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    select: { groupId: true }
  });

  await requireGroupMember(userId, session.groupId);

  const objectKey = z.string().min(1).parse(formData.get("objectKey"));
  const width = Number(formData.get("width") ?? 1200);
  const height = Number(formData.get("height") ?? 1600);
  const caption = String(formData.get("caption") ?? "");

  const photo = await prisma.photo.create({
    data: {
      sessionId,
      objectKey,
      width: Number.isFinite(width) ? width : 1200,
      height: Number.isFinite(height) ? height : 1600,
      caption,
      uploadedById: userId
    }
  });

  revalidatePath(`/app/groups/${session.groupId}/sessions/${sessionId}`);
  return { photoId: photo.id };
}
