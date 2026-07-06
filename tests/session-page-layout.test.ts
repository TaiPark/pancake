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
});
