# Stage-Task Experience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize PancakeHub around the user's current shoot stage so active plans, saving, stage advancement, AI errors, and mobile actions are immediately understandable.

**Architecture:** Keep the existing Next.js App Router, Prisma schema, server actions, and structured workflow data. Add small domain helpers and one atomic workflow save/advance action, then reshape the group board and session detail components around those contracts. Use existing Tailwind v4 utilities plus focused global CSS for the responsive stage rail and sticky action bar; do not add dependencies.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Tailwind CSS 4, Vitest, Playwright/in-app browser.

---

## Required execution skills

- `@superpowers:test-driven-development` before each implementation task.
- `@redesign-existing-projects` for targeted UI changes without changing the stack.
- `@superpowers:verification-before-completion` before claiming completion.
- `@superpowers:finishing-a-development-branch` after all verification succeeds.

### Task 1: Add explicit stage progression domain rules

**Files:**
- Modify: `lib/domain.ts:188-216`
- Test: `tests/domain.test.ts:15-102`

**Step 1: Write the failing test**

Add `nextSessionStage` to the import and add this test:

```ts
test("returns the next stage for guided progression", () => {
  expect(nextSessionStage(SessionStage.SPARK)).toBe(SessionStage.PLAN);
  expect(nextSessionStage(SessionStage.PLAN)).toBe(SessionStage.FEEDBACK);
  expect(nextSessionStage(SessionStage.FEEDBACK)).toBeNull();
});
```

**Step 2: Run the focused test and verify failure**

Run: `npx vitest run tests/domain.test.ts`

Expected: FAIL because `nextSessionStage` is not exported.

**Step 3: Implement the minimal helper**

Add after `canMoveSessionStage`:

```ts
export function nextSessionStage(stage: SessionStage): SessionStage | null {
  const next: Record<SessionStage, SessionStage | null> = {
    SPARK: SessionStage.PLAN,
    PLAN: SessionStage.FEEDBACK,
    FEEDBACK: null
  };

  return next[stage];
}
```

**Step 4: Run the focused test and verify success**

Run: `npx vitest run tests/domain.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/domain.ts tests/domain.test.ts
git commit -m "feat: define guided stage progression"
```

### Task 2: Save a workflow stage and advance atomically

**Files:**
- Modify: `app/actions.ts:11,620-664`
- Create: `tests/stage-experience.test.ts`

**Step 1: Write the failing source-contract test**

Create the file with:

```ts
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
```

**Step 2: Run the focused test and verify failure**

Run: `npx vitest run tests/stage-experience.test.ts`

Expected: FAIL because the combined action does not exist.

**Step 3: Implement the server action**

Import `nextSessionStage`. Add this action next to `updateSparkAction`:

```ts
export async function saveWorkflowStageAction(
  sessionId: string,
  _state: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const userId = await currentUserId();
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    select: { groupId: true, stage: true, sparkFields: true }
  });

  await requireGroupMember(userId, session.groupId);

  const nextSparkFields = mergeSparkFields(parseSparkFields(session.sparkFields), formData);
  const wantsAdvance = formData.get("intent") === "advance";
  const targetStage = wantsAdvance ? nextSessionStage(session.stage) : session.stage;

  if (wantsAdvance && (!targetStage || !canMoveSessionStage(session.stage, targetStage))) {
    return { error: "只能按顺序推进相邻阶段" };
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      sparkFields: nextSparkFields,
      stage: targetStage,
      updatedById: userId
    }
  });

  revalidatePath(`/app/groups/${session.groupId}`);
  revalidatePath(`/app/groups/${session.groupId}/sessions/${sessionId}`);
  return {
    ok: true,
    message: wantsAdvance && targetStage ? `已保存并进入${stageLabel(targetStage)}` : "当前阶段已保存"
  };
}
```

Also import `stageLabel`. Keep `updateSparkAction` temporarily until the session page is migrated in Task 4.

**Step 4: Run focused tests**

Run: `npx vitest run tests/stage-experience.test.ts tests/domain.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add app/actions.ts tests/stage-experience.test.ts
git commit -m "feat: save and advance shoot stages atomically"
```

### Task 3: Turn the workflow editor into a current-stage task surface

**Files:**
- Modify: `components/WorkflowEditor.tsx:1-152`
- Modify: `app/globals.css:509-529,548-556`
- Modify: `tests/workflow-layout.test.ts`
- Modify: `tests/stage-experience.test.ts`

**Step 1: Write failing editor contract tests**

Add assertions that require:

```ts
const editor = readFileSync("components/WorkflowEditor.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

expect(editor).toContain("useActionState");
expect(editor).toContain("未保存");
expect(editor).toContain('name="intent"');
expect(editor).toContain('value="save"');
expect(editor).toContain('value="advance"');
expect(editor).toContain("保存并进入");
expect(editor).toContain("当前阶段");
expect(editor).toContain("AI 生成失败");
expect(css).toContain(".workflow-action-bar");
expect(css).toContain("position: sticky");
expect(css).toContain(".workflow-stage-nav");
expect(css).toContain("overflow-x: auto");
```

Update the old workflow layout expectations from three tall `min-h-48` cards to compact stage buttons.

**Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/workflow-layout.test.ts tests/stage-experience.test.ts`

Expected: FAIL on the new editor and CSS contracts.

**Step 3: Refactor the editor**

- Change the action prop to:

```ts
type WorkflowActionState = { ok?: boolean; error?: string; message?: string } | null;

saveAction: (
  state: WorkflowActionState,
  formData: FormData
) => Promise<NonNullable<WorkflowActionState>>;
```

- Use `useActionState(saveAction, null)` for inline success/error state.
- Track `dirty` with `onChangeCapture={() => setDirty(true)}`.
- Reset `dirty` and refresh after a successful action result.
- Keep stage buttons selectable, but mark `section.stage === currentStage` as “当前阶段”. If the selected stage is not current, show “查看其他阶段不会改变当前进度”.
- When dirty, confirm before switching to another stage so edits are not silently discarded.
- Detect failed generation with `!aiGenerated && aiRawResponse.startsWith("ERROR:")`; render a direct “AI 生成失败” banner and keep the existing retry action.
- Replace the tall three-card rail with `.workflow-stage-nav` and `.workflow-stage-button`.
- Add a `.workflow-action-bar` inside the form containing:

```tsx
<span aria-live="polite">{dirty ? "有未保存修改" : actionState?.message ?? "已同步"}</span>
<PendingButton name="intent" value="save" pendingText="正在保存...">
  保存当前阶段
</PendingButton>
{selectedStage === currentStage && nextStage ? (
  <PendingButton name="intent" value="advance" pendingText={`正在进入${stageLabels[nextStage]}...`}>
    保存并进入{stageLabels[nextStage]}
  </PendingButton>
) : null}
```

- Use `nextSessionStage(currentStage)` for the label and final-stage behavior.

**Step 4: Add responsive CSS**

Implement:

```css
.workflow-stage-nav {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.workflow-stage-button {
  min-height: 7.5rem;
  transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
}

.workflow-action-bar {
  position: sticky;
  bottom: 0.75rem;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid rgb(245 247 251 / 0.14);
  border-radius: 10px;
  background: rgb(13 15 18 / 0.94);
  padding: 0.75rem;
  box-shadow: 0 18px 48px rgb(0 0 0 / 0.32);
  backdrop-filter: blur(18px);
}

@media (max-width: 767px) {
  .workflow-stage-nav {
    grid-auto-flow: column;
    grid-auto-columns: minmax(15rem, 84%);
    grid-template-columns: none;
    overflow-x: auto;
    scroll-snap-type: x proximity;
  }

  .workflow-stage-button {
    scroll-snap-align: start;
  }

  .workflow-action-bar {
    align-items: stretch;
    flex-direction: column;
  }
}
```

**Step 5: Run focused tests**

Run: `npx vitest run tests/workflow-layout.test.ts tests/stage-experience.test.ts tests/pending-actions.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add components/WorkflowEditor.tsx app/globals.css tests/workflow-layout.test.ts tests/stage-experience.test.ts
git commit -m "feat: guide users through the current shoot stage"
```

### Task 4: Simplify the session detail and gate the photo workspace by stage

**Files:**
- Modify: `app/app/groups/[groupId]/sessions/[sessionId]/page.tsx:1-140`
- Modify: `tests/session-page-layout.test.ts`
- Modify: `tests/stage-experience.test.ts`

**Step 1: Write failing page-contract tests**

Require the page to:

```ts
expect(source).toContain("saveWorkflowStageAction");
expect(source).toContain("activeSection.fields");
expect(source).toContain("session.stage === SessionStage.FEEDBACK");
expect(source).toContain("进入拍摄后阶段后，可在这里上传");
expect(source).not.toContain("updateSparkAction");
expect(source).not.toContain('lg:grid-cols-[1fr_0.9fr]');
```

**Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/session-page-layout.test.ts tests/stage-experience.test.ts`

Expected: FAIL.

**Step 3: Implement the focused session layout**

- Import `SessionStage` and `saveWorkflowStageAction`.
- Compute completion only from `activeSection.fields`.
- Replace the large split hero with a compact panel containing breadcrumb, title, current stage, stage completion, and updated-by metadata.
- Pass `saveAction={saveWorkflowStageAction.bind(null, session.id)}` and `key={session.stage}` to `WorkflowEditor`.
- Render `PhotoUploader` and `PhotoMasonry` only when `session.stage === SessionStage.FEEDBACK`.
- Before the feedback stage, render a compact informational panel: “进入拍摄后阶段后，可在这里上传样片、成片并记录反馈。”
- Remove the obsolete `updateSparkAction` import from this page. Remove `updateSparkAction` itself only if repository search shows no remaining consumers.

**Step 4: Run focused tests**

Run: `npx vitest run tests/session-page-layout.test.ts tests/stage-experience.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add app/app/groups/[groupId]/sessions/[sessionId]/page.tsx app/actions.ts tests/session-page-layout.test.ts tests/stage-experience.test.ts
git commit -m "feat: focus session pages on the active stage"
```

### Task 5: Put active plans before settings on the group board

**Files:**
- Create: `components/InviteCodeButton.tsx`
- Modify: `app/app/groups/[groupId]/page.tsx:58-147`
- Modify: `components/GroupSettingsDialog.tsx:26-80`
- Modify: `tests/group-ui.test.ts`
- Modify: `tests/stage-experience.test.ts`

**Step 1: Write failing group-board tests**

Add tests that verify:

```ts
expect(source.indexOf("<KanbanBoard")).toBeLessThan(source.indexOf("GroupSettingsDialog"));
expect(source).toContain("InviteCodeButton");
expect(source).toContain("isOwner ? (");
expect(source).toContain("继续正在进行的拍摄");
expect(settings).not.toContain("isOwner: boolean");
```

Add source contracts for `navigator.clipboard.writeText`, “复制邀请码”, and “已复制”.

**Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/group-ui.test.ts tests/stage-experience.test.ts`

Expected: FAIL.

**Step 3: Add the invite-code copy control**

Create a client component with a 2-second copied state:

```tsx
"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";

export function InviteCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button className="button button-secondary min-h-10 px-3 text-sm" onClick={copyCode} type="button">
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "已复制" : `复制邀请码 ${code}`}
    </button>
  );
}
```

**Step 4: Recompose the group page**

- Replace the tall metrics and “新的拍摄计划” card with a compact header.
- Keep group name, member count, plan count, `InviteCodeButton`, and `CreateSessionDialog` in the header.
- Place `KanbanBoard` immediately after the compact header with a “继续正在进行的拍摄” heading.
- Render `<GroupSettingsDialog ... />` only inside `{isOwner ? (...) : null}` and after the board as a secondary owner-tools region.
- Since the component is now owner-only, remove the `isOwner` prop from `GroupSettingsDialog` and pass `isOwner={true}` internally to the existing configuration panels.

**Step 5: Run focused tests**

Run: `npx vitest run tests/group-ui.test.ts tests/stage-experience.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add components/InviteCodeButton.tsx app/app/groups/[groupId]/page.tsx components/GroupSettingsDialog.tsx tests/group-ui.test.ts tests/stage-experience.test.ts
git commit -m "feat: prioritize active shoot plans on group boards"
```

### Task 6: Clarify card actions and protect session deletion

**Files:**
- Create: `components/DeleteSessionButton.tsx`
- Modify: `components/KanbanBoard.tsx:1-136`
- Modify: `app/actions.ts:604-618`
- Modify: `app/globals.css`
- Modify: `tests/group-ui.test.ts`
- Modify: `tests/stage-experience.test.ts`

**Step 1: Write failing action hierarchy tests**

Require:

```ts
expect(board).toContain("继续处理");
expect(board).toContain("进入${stageLabel(target)}");
expect(board).toContain("DeleteSessionButton");
expect(board).toContain("kanban-column");
expect(deleteButton).toContain("window.confirm");
expect(deleteButton).toContain("确认删除拍摄计划");
expect(css).toContain("--mobile-order");
```

Remove the old test requiring “查看策划详情”.

**Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/group-ui.test.ts tests/stage-experience.test.ts`

Expected: FAIL.

**Step 3: Add confirmed session deletion**

- Change `deleteSessionAction` to return `ActionState`, handling a missing plan with a direct error.
- Build `DeleteSessionButton` from the existing `DeleteGroupButton` pattern with a confirmation message that names the plan and explains that its workflow and photos will be deleted.
- Keep it icon-only and secondary.

**Step 4: Simplify `KanbanBoard` actions**

- Replace the inline delete form with `DeleteSessionButton`.
- Rename the main link to `继续处理${stageLabel(session.stage)}任务`.
- Rename transition controls to `进入${stageLabel(target)}`.
- Add `className="kanban-column ..."` and a CSS custom property `--mobile-order` so non-empty columns come before empty columns on widths below `1024px`, without changing desktop lifecycle order.
- Reduce empty mobile column height; retain the three-column desktop layout.

**Step 5: Run focused tests**

Run: `npx vitest run tests/group-ui.test.ts tests/stage-experience.test.ts tests/pending-actions.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add components/DeleteSessionButton.tsx components/KanbanBoard.tsx app/actions.ts app/globals.css tests/group-ui.test.ts tests/stage-experience.test.ts tests/pending-actions.test.ts
git commit -m "feat: clarify and protect shoot plan actions"
```

### Task 7: Make AI creation promises accurate

**Files:**
- Modify: `components/CreateSessionDialog.tsx:24-152`
- Modify: `app/actions.ts:47-53,436-526`
- Modify: `tests/group-ui.test.ts`
- Modify: `tests/stage-experience.test.ts`

**Step 1: Write failing AI-validation tests**

Require:

```ts
expect(dialog).toContain("aiDescriptionMissing");
expect(dialog).toContain("请先填写拍摄意图");
expect(dialog).toContain("required={useAi}");
expect(dialog).toContain("创建并生成拍摄前规划");
expect(actions).toContain("使用 AI 时请填写拍摄意图");
```

**Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/group-ui.test.ts tests/stage-experience.test.ts`

Expected: FAIL.

**Step 3: Add client validation and accurate copy**

- Derive `const aiDescriptionMissing = useAi && description.trim().length === 0`.
- Before starting the transition, set the error to “请先填写拍摄意图，再使用 AI 生成规划。” when missing.
- Add `required={useAi}` and `aria-describedby` to the description field.
- Disable submit when `pending || !title.trim() || aiDescriptionMissing`.
- Rename the AI submit label to “创建并生成拍摄前规划”.
- Keep manual creation available by unchecking AI.

**Step 4: Add server-side validation**

Use `superRefine` on `createSessionWithAiSchema`:

```ts
}).superRefine((data, context) => {
  if (data.useAi && data.description.trim().length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["description"],
      message: "使用 AI 时请填写拍摄意图"
    });
  }
});
```

Keep the existing catch behavior that stores an `ERROR:` response; Task 3 surfaces that state clearly.

**Step 5: Run focused tests**

Run: `npx vitest run tests/group-ui.test.ts tests/stage-experience.test.ts tests/llm.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add components/CreateSessionDialog.tsx app/actions.ts tests/group-ui.test.ts tests/stage-experience.test.ts
git commit -m "feat: validate AI shoot plan creation"
```

### Task 8: Complete regression and responsive verification

**Files:**
- Modify if needed: `app/globals.css`
- Modify if needed: `tests/e2e/app.spec.ts`
- Modify: `README.md` only if visible workflow descriptions are now inaccurate.

**Step 1: Run formatting/static checks available in the project**

Run: `npm run lint`

Expected: PASS. If the existing `next lint` script is unsupported by the installed Next version, record the exact failure and use `npx tsc --noEmit` plus `npm run build` as the authoritative static checks; do not hide the script issue.

**Step 2: Run the complete unit suite**

Run: `npm test`

Expected: 12 or more test files pass, including the new stage-experience coverage.

**Step 3: Run production build**

Run: `npm run build`

Expected: Prisma generation and Next.js production compilation succeed.

**Step 4: Prepare the isolated runtime**

- Copy or symlink the repository root `.env` into the worktree without committing it.
- Reuse the existing PostgreSQL and MinIO containers.
- Apply committed migrations with `npx prisma migrate deploy`.
- Start the worktree dev server on an unused port, such as `npm run dev -- -p 3001`.

**Step 5: Verify desktop behavior in the local browser**

Using the demo account from `README.md`, verify:

1. Existing plans appear before owner settings on the group page.
2. “继续处理拍摄前任务” opens the correct detail.
3. Editing a field shows “有未保存修改”.
4. “保存并进入拍摄中” persists the form and moves the session exactly one stage.
5. The photo uploader is hidden before feedback and appears during feedback.
6. AI mode cannot submit with an empty description.
7. Delete plan asks for confirmation.

Do not leave the seeded demo session in a changed stage after verification; create a disposable plan for mutation checks and delete it through the UI when finished.

**Step 6: Verify 390x844 mobile behavior**

Check the group page and session detail at a 390x844 viewport:

- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
- An active plan and its continue action are visible without scrolling past a large creation/settings card.
- Stage navigation scrolls horizontally.
- The sticky action bar remains visible while editing and does not cover the final input.
- All main actions are at least 44px high.

**Step 7: Run a final diff audit**

Run:

```bash
git status --short
git diff --check
git diff main...HEAD --stat
```

Expected: no whitespace errors, no `.env`, generated build output, or unrelated `.workbuddy/` content in the branch.

**Step 8: Commit any verification-only corrections**

```bash
git add <only-the-files-adjusted-during-verification>
git commit -m "fix: polish responsive stage workflow"
```

Skip this commit when verification required no code changes.

---

## Completion evidence

The implementation is complete only when all of these are true:

- Domain progression tests prove the final stage has no next stage.
- Source and unit tests prove save-and-advance is one server action.
- The group page renders the board before owner settings and hides settings for members.
- The session page calculates current-stage completion and gates photos by feedback stage.
- AI mode is validated on both client and server.
- Full tests and production build pass.
- Browser verification proves the desktop and 390px mobile flows.
- The branch contains only scoped product, test, CSS, and plan changes.
