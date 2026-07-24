import { SessionStage } from "@prisma/client";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSparkFields } from "@/lib/domain";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
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
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      update: mocks.update,
      updateMany: mocks.updateMany
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
  generateSparkFields: vi.fn()
}));

vi.mock("@/lib/storage", () => ({
  createPhotoUploadUrl: vi.fn()
}));

import { saveWorkflowStageAction } from "@/app/actions";

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
    expect(editor).toContain("disabled={pending}");
    expect(editor).toContain("aria-busy={pending}");
    expect(fieldsetStart).toBeGreaterThan(-1);
    expect(editor.indexOf("<StructuredWorkflowField")).toBeGreaterThan(fieldsetStart);
    expect(editor.indexOf('className="workflow-action-bar"')).toBeGreaterThan(fieldsetStart);
    expect(fieldsetEnd).toBeGreaterThan(editor.indexOf('className="workflow-action-bar"'));
  });

  it("styles save errors even when unsaved edits remain", () => {
    const editor = readFileSync("components/WorkflowEditor.tsx", "utf8");

    expect(editor).toContain('className={actionState?.error ? "text-sm text-red-100"');
    expect(editor).not.toContain("!dirty && actionState?.error");
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
