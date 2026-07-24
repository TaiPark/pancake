import { SessionStage } from "@prisma/client";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSparkFields } from "@/lib/domain";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  findUnique: vi.fn(),
  findLlmConfig: vi.fn(),
  findLlmSkill: vi.fn(),
  deleteSession: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  generateSparkFields: vi.fn(),
  requireGroupMember: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
  signIn: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: mocks.findUnique,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      update: mocks.update,
      updateMany: mocks.updateMany,
      delete: mocks.deleteSession
    },
    llmConfig: {
      findUnique: mocks.findLlmConfig
    },
    llmSkill: {
      findFirst: mocks.findLlmSkill
    }
  }
}));

vi.mock("@/lib/permissions", () => ({
  requireGroupMember: mocks.requireGroupMember
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {}
}));

vi.mock("@/lib/invite", () => ({
  validateRegistrationInvite: vi.fn()
}));

vi.mock("@/lib/llm", () => ({
  callLlm: vi.fn(),
  generateSparkFields: mocks.generateSparkFields
}));

vi.mock("@/lib/storage", () => ({
  createPhotoUploadUrl: vi.fn()
}));

import { deleteSessionAction, regenerateSparkFieldsAction, saveWorkflowStageAction } from "@/app/actions";

describe("workflow editor stage experience", () => {
  it("submits save and advance intents with inline action state", () => {
    const editor = readFileSync("components/WorkflowEditor.tsx", "utf8");

    expect(editor).toContain("useActionState");
    expect(editor).toContain('name="intent"');
    expect(editor).toContain('value="save"');
    expect(editor).toContain('value="advance"');
    expect(editor).toContain("保存并进入");
  });

  it("distinguishes current-stage work and failed AI generation", () => {
    const editor = readFileSync("components/WorkflowEditor.tsx", "utf8");

    expect(editor).toContain("当前阶段");
    expect(editor).toContain("AI 生成失败");
  });

  it("remounts after advancement and tracks structured row edits as dirty", () => {
    const editor = readFileSync("components/WorkflowEditor.tsx", "utf8");
    const page = readFileSync("app/app/groups/[groupId]/sessions/[sessionId]/page.tsx", "utf8");

    expect(page).toContain("key={session.stage}");
    expect(editor).toContain("onClickCapture");
    expect(editor).toContain("data-workflow-utility");
  });

  it("disables the editable workflow region while its action is pending", () => {
    const editor = readFileSync("components/WorkflowEditor.tsx", "utf8");
    const fieldsetStart = editor.indexOf("<fieldset");
    const fieldsetEnd = editor.indexOf("</fieldset>");

    expect(editor).toContain("const [actionState, formAction, pending]");
    expect(editor).toContain("disabled={interactionPending}");
    expect(editor).toContain("aria-busy={interactionPending}");
    expect(fieldsetStart).toBeGreaterThan(-1);
    expect(editor.indexOf("<StructuredWorkflowField")).toBeGreaterThan(fieldsetStart);
    expect(editor.indexOf('className="workflow-action-bar"')).toBeGreaterThan(fieldsetStart);
    expect(fieldsetEnd).toBeGreaterThan(editor.indexOf('className="workflow-action-bar"'));
  });

  it("locks editing and stage navigation during either save or AI regeneration", () => {
    const editor = readFileSync("components/WorkflowEditor.tsx", "utf8");

    expect(editor).toContain("const interactionPending = pending || regenerating");
    expect(editor).toContain("disabled={interactionPending}");
    expect(editor).toContain("aria-busy={interactionPending}");
  });

  it("synchronizes regular text fields when refreshed server values change", () => {
    const field = readFileSync("components/StructuredWorkflowField.tsx", "utf8");

    expect(field).toContain("const [draftValue, setDraftValue] = useState(value)");
    expect(field).toContain("setDraftValue(value)");
    expect(field).toContain("value={draftValue}");
    expect(field).not.toContain("defaultValue={value}");
  });

  it("styles save errors even when unsaved edits remain", () => {
    const editor = readFileSync("components/WorkflowEditor.tsx", "utf8");

    expect(editor).toContain('className={actionState?.error ? "text-sm text-red-100"');
    expect(editor).not.toContain("!dirty && actionState?.error");
  });
});

describe("group board stage experience", () => {
  it("prioritizes continuing active shoots before owner tools", () => {
    const source = readFileSync("app/app/groups/[groupId]/page.tsx", "utf8");

    expect(source.indexOf("<KanbanBoard")).toBeGreaterThan(-1);
    expect(source.indexOf("<KanbanBoard")).toBeLessThan(source.indexOf("<GroupSettingsDialog"));
    expect(source).toContain("继续正在进行的拍摄");
    expect(source).toContain("isOwner ? (");
  });

  it("uses protected session deletion and mobile column ordering", () => {
    const board = readFileSync("components/KanbanBoard.tsx", "utf8");
    const deleteButton = readFileSync("components/DeleteSessionButton.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    expect(board).toContain("DeleteSessionButton");
    expect(board).toContain("继续处理");
    expect(deleteButton).toContain("window.confirm");
    expect(css).toContain("--mobile-order");
  });
});

describe("deleteSessionAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: userId } });
  });

  it("returns a direct error when the shoot plan no longer exists", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const result = await deleteSessionAction(sessionId);

    expect(result).toEqual({ error: "拍摄计划不存在" });
    expect(mocks.requireGroupMember).not.toHaveBeenCalled();
    expect(mocks.deleteSession).not.toHaveBeenCalled();
  });
});

describe("regenerateSparkFieldsAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: userId } });
    mocks.requireGroupMember.mockResolvedValue(undefined);
    mocks.findUnique.mockResolvedValue({
      id: sessionId,
      groupId,
      description: "雨夜街头人像",
      skillId: null,
      updatedAt
    });
    mocks.findLlmConfig.mockResolvedValue({
      apiKey: "test-key",
      baseUrl: "https://example.com/v1",
      model: "test-model",
      temperature: 0.7,
      maxTokens: 2000
    });
    mocks.generateSparkFields.mockResolvedValue({
      sparkFields: { ...defaultSparkFields, theme: "AI 新主题" },
      rawResponse: "generated"
    });
  });

  it("does not overwrite edits saved while AI generation was in flight", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const result = await regenerateSparkFieldsAction(sessionId);

    expect(result).toEqual({ error: "拍摄计划已在生成期间更新，请重试" });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: sessionId, updatedAt },
      data: {
        sparkFields: { ...defaultSparkFields, theme: "AI 新主题" },
        aiGenerated: true,
        aiRawResponse: "generated",
        updatedById: userId
      }
    });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

const sessionId = "session-1";
const groupId = "group-1";
const userId = "user-1";
const updatedAt = new Date("2026-07-23T10:00:00.000Z");

describe("saveWorkflowStageAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: userId } });
    mocks.requireGroupMember.mockResolvedValue(undefined);
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("saves merged fields without changing the current stage", async () => {
    const sparkFields = {
      ...defaultSparkFields,
      theme: "旧主题",
      mood: "保留的情绪"
    };
    mocks.findUniqueOrThrow.mockResolvedValue({
      groupId,
      stage: SessionStage.SPARK,
      sparkFields,
      updatedAt
    });
    const formData = new FormData();
    formData.set("theme", "新主题");

    const result = await saveWorkflowStageAction(sessionId, null, formData);

    expect(result).toEqual({ ok: true, message: "当前阶段已保存" });
    expect(mocks.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: sessionId },
      select: { groupId: true, stage: true, sparkFields: true, updatedAt: true }
    });
    expect(mocks.updateMany).toHaveBeenCalledOnce();
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: sessionId,
        stage: SessionStage.SPARK,
        updatedAt
      },
      data: {
        sparkFields: {
          ...sparkFields,
          theme: "新主题"
        },
        stage: SessionStage.SPARK,
        updatedById: userId
      }
    });
  });

  it("saves merged fields and advances to the next stage", async () => {
    const sparkFields = {
      ...defaultSparkFields,
      theme: "保留的主题",
      mood: "旧情绪"
    };
    mocks.findUniqueOrThrow.mockResolvedValue({
      groupId,
      stage: SessionStage.SPARK,
      sparkFields,
      updatedAt
    });
    const formData = new FormData();
    formData.set("mood", "新情绪");
    formData.set("intent", "advance");

    const result = await saveWorkflowStageAction(sessionId, null, formData);

    expect(result).toEqual({ ok: true, message: "已保存并进入拍摄中" });
    expect(mocks.updateMany).toHaveBeenCalledOnce();
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: sessionId,
        stage: SessionStage.SPARK,
        updatedAt
      },
      data: {
        sparkFields: {
          ...sparkFields,
          mood: "新情绪"
        },
        stage: SessionStage.PLAN,
        updatedById: userId
      }
    });
  });

  it("rejects advancing beyond the terminal stage without mutation", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({
      groupId,
      stage: SessionStage.FEEDBACK,
      sparkFields: defaultSparkFields,
      updatedAt
    });
    const formData = new FormData();
    formData.set("intent", "advance");

    const result = await saveWorkflowStageAction(sessionId, null, formData);

    expect(result).toEqual({ error: "只能按顺序推进相邻阶段" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not mutate when membership verification rejects", async () => {
    const membershipError = new Error("FORBIDDEN");
    mocks.findUniqueOrThrow.mockResolvedValue({
      groupId,
      stage: SessionStage.SPARK,
      sparkFields: defaultSparkFields,
      updatedAt
    });
    mocks.requireGroupMember.mockRejectedValue(membershipError);

    await expect(saveWorkflowStageAction(sessionId, null, new FormData())).rejects.toBe(membershipError);

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a conflict without revalidation when the session changed concurrently", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({
      groupId,
      stage: SessionStage.PLAN,
      sparkFields: defaultSparkFields,
      updatedAt
    });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const formData = new FormData();
    formData.set("liveNotes", "新的现场记录");

    const result = await saveWorkflowStageAction(sessionId, null, formData);

    expect(result).toEqual({ error: "拍摄计划已被其他成员更新，请刷新后重试" });
    expect(mocks.updateMany).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
