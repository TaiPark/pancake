import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("session detail layout", () => {
  it("removes the separate execution document editor and preview", () => {
    const source = readFileSync("app/app/groups/[groupId]/sessions/[sessionId]/page.tsx", "utf8");

    expect(source).not.toContain("执行文档");
    expect(source).not.toContain("文档预览");
    expect(source).not.toContain("updatePlanAction");
    expect(source).not.toContain("renderMarkdown");
    expect(source).not.toContain("defaultPlanMarkdown");
    expect(source).not.toContain("planMarkdown");
  });

  it("lets the workflow editor own the full primary row", () => {
    const source = readFileSync("app/app/groups/[groupId]/sessions/[sessionId]/page.tsx", "utf8");

    expect(source).not.toContain("xl:grid-cols-[1.1fr_0.9fr]");
    expect(source).toContain('className="grid gap-4"');
  });

  it("focuses completion and media on the current stage", () => {
    const source = readFileSync("app/app/groups/[groupId]/sessions/[sessionId]/page.tsx", "utf8");

    expect(source).toContain("saveWorkflowStageAction");
    expect(source).toContain("key={session.stage}");
    expect(source).toContain("saveAction={saveWorkflowStageAction.bind(null, session.id)}");
    expect(source).toContain("activeSection.fields");
    expect(source).toContain("session.stage === SessionStage.FEEDBACK");
    expect(source).not.toContain("workflowSections.flatMap");
    expect(source).toContain("进入拍摄后阶段后，可在这里上传");
    expect(source).not.toContain("updateSparkAction");
    expect(source).not.toContain('lg:grid-cols-[1fr_0.9fr]');
  });

  it("removes the obsolete standalone workflow save action", () => {
    const actions = readFileSync("app/actions.ts", "utf8");

    expect(actions).not.toContain("export async function updateSparkAction");
  });
});
