"use server";

import { SessionStage } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, signIn, signOut } from "@/lib/auth";
import { canMoveSessionStage, defaultSparkFields } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireGroupMember } from "@/lib/permissions";
import { makeInviteCode, slugify } from "@/lib/slug";
import { createPhotoUploadUrl } from "@/lib/storage";

const signupSchema = z.object({
  name: z.string().min(2, "请填写昵称"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位")
});

const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位")
});

async function currentUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user.id;
}

export async function signupAction(_state: { error?: string } | undefined, formData: FormData) {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "注册信息不完整" };
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

export async function createSessionAction(groupId: string, formData: FormData) {
  const userId = await currentUserId();
  await requireGroupMember(userId, groupId);

  const title = z.string().min(2).parse(formData.get("title"));

  const session = await prisma.session.create({
    data: {
      groupId,
      title,
      sparkFields: defaultSparkFields,
      updatedById: userId
    }
  });

  revalidatePath(`/app/groups/${groupId}`);
  redirect(`/app/groups/${groupId}/sessions/${session.id}`);
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
    select: { groupId: true }
  });

  await requireGroupMember(userId, session.groupId);

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      sparkFields: {
        theme: String(formData.get("theme") ?? ""),
        mood: String(formData.get("mood") ?? ""),
        references: String(formData.get("references") ?? ""),
        notes: String(formData.get("notes") ?? "")
      },
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
