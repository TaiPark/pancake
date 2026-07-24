import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const filesWithWaitingActions = [
  "components/AuthForm.tsx",
  "components/CreateSessionDialog.tsx",
  "components/WorkflowEditor.tsx",
  "components/PhotoUploader.tsx",
  "components/LlmConfigPanel.tsx",
  "components/SkillManager.tsx",
  "components/DeleteGroupButton.tsx",
  "components/DeleteSessionButton.tsx",
  "components/PhotoMasonry.tsx",
  "components/AppShell.tsx",
  "components/KanbanBoard.tsx",
  "components/StageControls.tsx",
  "app/app/groups/page.tsx"
];

describe("pending action feedback", () => {
  it("provides a reusable pending button with React Bits Shiny Text", () => {
    expect(existsSync("components/PendingButton.tsx")).toBe(true);
    expect(existsSync("components/react-bits/ShinyText.tsx")).toBe(true);

    const pendingButton = readFileSync("components/PendingButton.tsx", "utf8");
    const shinyText = readFileSync("components/react-bits/ShinyText.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    expect(pendingButton).toContain("useFormStatus");
    expect(pendingButton).toContain("ShinyText");
    expect(shinyText).toContain("shiny-text");
    expect(css).toContain(".shiny-text");
    expect(css).toContain("shiny-text-sweep");
  });

  it("uses pending feedback on user actions that can take time", () => {
    for (const file of filesWithWaitingActions) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("PendingButton");
    }
  });
});
