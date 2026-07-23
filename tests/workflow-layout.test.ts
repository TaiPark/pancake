import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("workflow editor layout styles", () => {
  it("uses compact stage navigation instead of tall workflow cards", () => {
    const source = readFileSync("components/WorkflowEditor.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    expect(source).toContain('className="grid content-start gap-4"');
    expect(source).toContain('className="workflow-stage-nav"');
    expect(source).toContain("workflow-stage-button");
    expect(source).not.toContain("min-h-48");
    expect(css).toContain(".workflow-stage-nav");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(css).toContain(".workflow-stage-button");
    expect(css).toContain("min-height: 7.5rem;");
  });

  it("keeps stage navigation scrollable and actions sticky on mobile", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain(".workflow-action-bar");
    expect(css).toContain("position: sticky");
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("grid-auto-flow: column");
    expect(css).toContain("scroll-snap-type: x proximity");
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
