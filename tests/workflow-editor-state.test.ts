import { SessionStage } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canAdvanceWorkflow,
  isAiGenerationFailure,
  requiresStageSwitchConfirmation,
  workflowStatusText
} from "@/lib/workflow-editor-state";

describe("workflow editor state", () => {
  it("requires confirmation only when dirty work would be discarded", () => {
    expect(requiresStageSwitchConfirmation(true, SessionStage.SPARK, SessionStage.PLAN)).toBe(true);
    expect(requiresStageSwitchConfirmation(false, SessionStage.SPARK, SessionStage.PLAN)).toBe(false);
    expect(requiresStageSwitchConfirmation(true, SessionStage.SPARK, SessionStage.SPARK)).toBe(false);
  });

  it("recognizes only ungenerated ERROR-prefixed AI responses as failures", () => {
    expect(isAiGenerationFailure(false, "ERROR: provider unavailable")).toBe(true);
    expect(isAiGenerationFailure(true, "ERROR: stale diagnostic")).toBe(false);
    expect(isAiGenerationFailure(false, "error: provider unavailable")).toBe(false);
    expect(isAiGenerationFailure(false, " ERROR: provider unavailable")).toBe(false);
  });

  it("offers advance only from the selected current stage when a next stage exists", () => {
    expect(canAdvanceWorkflow(SessionStage.SPARK, SessionStage.SPARK, SessionStage.PLAN)).toBe(true);
    expect(canAdvanceWorkflow(SessionStage.PLAN, SessionStage.SPARK, SessionStage.PLAN)).toBe(false);
    expect(canAdvanceWorkflow(SessionStage.FEEDBACK, SessionStage.FEEDBACK, null)).toBe(false);
  });

  it("prioritizes dirty, failed, successful, and synchronized status text", () => {
    expect(workflowStatusText(true, { error: "保存失败" })).toBe("有未保存修改");
    expect(workflowStatusText(false, { error: "保存失败" })).toBe("保存失败");
    expect(workflowStatusText(false, { ok: true, message: "当前阶段已保存" })).toBe("当前阶段已保存");
    expect(workflowStatusText(false, null)).toBe("已同步");
  });
});
