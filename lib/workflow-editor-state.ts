import type { SessionStage } from "@prisma/client";

export type WorkflowActionState = { ok?: boolean; error?: string; message?: string } | null;

export function requiresStageSwitchConfirmation(
  dirty: boolean,
  selectedStage: SessionStage,
  targetStage: SessionStage
): boolean {
  return dirty && selectedStage !== targetStage;
}

export function isAiGenerationFailure(aiGenerated: boolean, rawResponse: string): boolean {
  return !aiGenerated && rawResponse.startsWith("ERROR:");
}

export function canAdvanceWorkflow(
  selectedStage: SessionStage,
  currentStage: SessionStage,
  nextStage: SessionStage | null
): boolean {
  return selectedStage === currentStage && nextStage !== null;
}

export function workflowStatusText(dirty: boolean, actionState: WorkflowActionState): string {
  if (dirty) return "有未保存修改";
  if (actionState?.error) return actionState.error;
  if (actionState?.message) return actionState.message;
  if (actionState?.ok) return "已保存";
  return "已同步";
}
