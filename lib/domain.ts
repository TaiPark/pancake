import { SessionStage } from "@prisma/client";

export type SparkFields = {
  theme: string;
  mood: string;
  references: string;
  notes: string;
};

export const defaultSparkFields: SparkFields = {
  theme: "",
  mood: "",
  references: "",
  notes: ""
};

export function parseSparkFields(value: unknown): SparkFields {
  if (!value || typeof value !== "object") {
    return defaultSparkFields;
  }

  const record = value as Partial<Record<keyof SparkFields, unknown>>;

  return {
    theme: typeof record.theme === "string" ? record.theme : "",
    mood: typeof record.mood === "string" ? record.mood : "",
    references: typeof record.references === "string" ? record.references : "",
    notes: typeof record.notes === "string" ? record.notes : ""
  };
}

export function canMoveSessionStage(from: SessionStage, to: SessionStage): boolean {
  if (from === to) return true;

  const order = [SessionStage.SPARK, SessionStage.PLAN, SessionStage.FEEDBACK];
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);

  return fromIndex !== -1 && toIndex !== -1 && Math.abs(fromIndex - toIndex) === 1;
}

export function stageLabel(stage: SessionStage): string {
  const labels: Record<SessionStage, string> = {
    SPARK: "思维火花",
    PLAN: "规划",
    FEEDBACK: "反馈"
  };

  return labels[stage];
}

export function stageHint(stage: SessionStage): string {
  const hints: Record<SessionStage, string> = {
    SPARK: "主题、情绪、参考和还没有长成方案的念头。",
    PLAN: "把摄影策划写成可执行的 Markdown。",
    FEEDBACK: "拍摄完成后的作品、注释和回看。"
  };

  return hints[stage];
}
