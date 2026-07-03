import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("group management UI", () => {
  it("renders group cards with a confirmed delete action outside navigation", () => {
    const source = readFileSync("app/app/groups/page.tsx", "utf8");
    const deleteButton = readFileSync("components/DeleteGroupButton.tsx", "utf8");

    expect(source).toContain("DeleteGroupButton");
    expect(source).toContain("<article");
    expect(deleteButton).toContain("confirm(");
    expect(deleteButton).toContain("deleteGroupAction");
    expect(deleteButton).toContain("删除小组");
  });

  it("keeps AI configuration and Skill management behind a settings dialog", () => {
    const source = readFileSync("app/app/groups/[groupId]/page.tsx", "utf8");
    const settings = readFileSync("components/GroupSettingsDialog.tsx", "utf8");

    expect(source).toContain("GroupSettingsDialog");
    expect(source).not.toContain("<LlmConfigPanel");
    expect(source).not.toContain("<SkillManager");
    expect(settings).toContain("LlmConfigPanel");
    expect(settings).toContain("SkillManager");
    expect(settings).toContain("群组设置");
  });

  it("communicates default Skill fallback when no custom Skill exists", () => {
    const manager = readFileSync("components/SkillManager.tsx", "utf8");
    const createDialog = readFileSync("components/CreateSessionDialog.tsx", "utf8");

    expect(manager).toContain("未创建自定义 Skill 时");
    expect(manager).toContain("默认生成模板");
    expect(createDialog).toContain("默认生成模板");
    expect(createDialog).toContain("当前使用默认生成模板");
  });
});
