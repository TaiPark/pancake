import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("group management UI", () => {
  it("uses user-friendly copy instead of internal planning jargon", () => {
    const visibleCopyFiles = [
      "app/app/groups/page.tsx",
      "app/app/groups/[groupId]/page.tsx",
      "app/signup/page.tsx",
      "components/CreateSessionDialog.tsx",
      "components/KanbanBoard.tsx",
      "components/WorkflowEditor.tsx",
      "components/GroupSettingsDialog.tsx",
      "components/LlmConfigPanel.tsx",
      "components/SkillManager.tsx"
    ];

    for (const file of visibleCopyFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(
        /(创建 Session|Session 标题|拍摄 Session|个 Session|Session 看板|群组已配置 LLM|群组尚未配置 LLM|请联系 OWNER|编辑 Skill|新建 Skill|保存 Skill|Skill 管理|Skill 是|未创建自定义 Skill|选择 Skill|SPARK 字段|当前 SPARK)/
      );
    }

    const actions = readFileSync("app/actions.ts", "utf8");
    expect(actions).not.toMatch(/(Session 信息不完整|Session 不存在|Session 没有描述内容|群组未配置 LLM|只有群组 OWNER|Skill 信息不完整)/);
  });

  it("prioritizes existing groups when memberships are present", () => {
    const source = readFileSync("app/app/groups/page.tsx", "utf8");
    const listIndex = source.indexOf('aria-label="已加入的小组"');
    const formIndex = source.indexOf('aria-label={groups.length > 0 ? "创建或加入小组" : "开始创建或加入小组"}');

    expect(source).toContain("选择创作小组");
    expect(source).not.toContain("选择一个创作小组。");
    expect(source).toContain("groups.length > 0");
    expect(source).toContain("已有小组");
    expect(source).toContain("开始创建或加入小组");
    expect(listIndex).toBeGreaterThan(-1);
    expect(formIndex).toBeGreaterThan(-1);
    expect(listIndex).toBeLessThan(formIndex);
  });

  it("renders group cards with a confirmed delete action outside navigation", () => {
    const source = readFileSync("app/app/groups/page.tsx", "utf8");
    const deleteButton = readFileSync("components/DeleteGroupButton.tsx", "utf8");

    expect(source).toContain("DeleteGroupButton");
    expect(source).toContain("relative");
    expect(deleteButton).toContain("confirm(");
    expect(deleteButton).toContain("deleteGroupAction");
    expect(deleteButton).toContain("absolute right-4 top-4");
    expect(deleteButton).toContain("button-icon");
    expect(deleteButton).toContain("aria-label={`删除小组 ${groupName}`}");
    expect(deleteButton).not.toContain(">删除小组<");
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

  it("communicates default generation-template fallback when no custom template exists", () => {
    const manager = readFileSync("components/SkillManager.tsx", "utf8");
    const createDialog = readFileSync("components/CreateSessionDialog.tsx", "utf8");

    expect(manager).toContain("未创建自定义模板时");
    expect(manager).toContain("默认生成模板");
    expect(createDialog).toContain("默认生成模板");
    expect(createDialog).toContain("当前使用默认生成模板");
  });

  it("keeps session delete actions as icon-only secondary controls", () => {
    const board = readFileSync("components/KanbanBoard.tsx", "utf8");

    expect(board).toContain("session-card-actions");
    expect(board).toContain("aria-label={`删除 ${session.title}`}");
    expect(board).toContain("h-6 w-6");
    expect(board).toContain("pendingContent={<Trash size={12} aria-hidden=\"true\" />}");
    expect(board).not.toContain("button button-danger button-icon");
    expect(board).not.toContain(">删除<");
  });

  it("shows an explicit details entry on shoot-plan cards", () => {
    const board = readFileSync("components/KanbanBoard.tsx", "utf8");

    expect(board).toContain("查看策划详情");
    expect(board).toContain("button button-secondary");
    expect(board).toContain("ArrowRight");
  });
});
