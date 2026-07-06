import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("workflow editor layout styles", () => {
  it("keeps stage cards compact when adjacent panels are taller", () => {
    const source = readFileSync("components/WorkflowEditor.tsx", "utf8");

    expect(source).toContain('className="grid content-start gap-4"');
    expect(source).toContain('className="workflow-rail grid items-stretch gap-3 md:grid-cols-3"');
    expect(source).toContain("min-h-48");
  });

  it("does not use the broad panel sweep for active stage cards", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).not.toContain(".workflow-card-active::before");
  });

  it("uses auto-growing text areas for regular workflow text fields", () => {
    const source = readFileSync("components/StructuredWorkflowField.tsx", "utf8");

    expect(source).toContain("AutoGrowTextarea");
    expect(source).toContain("adjustHeight");
    expect(source).not.toContain("<input className=\"field\"");
  });

  it("keeps every shot-list column on the same desktop row", () => {
    const source = readFileSync("components/StructuredWorkflowField.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    expect(source).toContain("repeat(${tableFormat.columns.length}, minmax(8.5rem, 1fr))");
    expect(source).not.toContain("Math.min(tableFormat.columns.length, 4)");
    expect(css).toContain("overflow-x: auto;");
    expect(css).toContain("min-width: max-content;");
  });
});
