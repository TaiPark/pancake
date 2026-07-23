import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("stage-task workflow actions", () => {
  it("saves fields and advances the current stage in one server action", () => {
    const source = readFileSync("app/actions.ts", "utf8");

    expect(source).toContain("saveWorkflowStageAction");
    expect(source).toContain('formData.get("intent") === "advance"');
    expect(source).toContain("nextSessionStage(session.stage)");
    expect(source).toContain("sparkFields: nextSparkFields");
    expect(source).toContain("stage: targetStage");
    expect(source).toContain("只能按顺序推进相邻阶段");
  });
});
