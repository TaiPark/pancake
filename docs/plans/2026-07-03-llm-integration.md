# LLM Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add group-configurable LLM planning so users can create Sessions from detailed descriptions and auto-fill SPARK fields via an OpenAI-compatible model.

**Architecture:** Persist group LLM config and group Skills in Prisma. Keep LLM calling logic in `lib/llm.ts`, Server Actions in `app/actions.ts`, and UI in focused client components rendered from the existing group and session pages. Use synchronous generation for the first version.

**Tech Stack:** Next.js App Router, React Server Actions, Prisma/PostgreSQL, Vitest, existing Tailwind/global CSS classes.

---

### Task 1: LLM Core Unit Tests

**Files:**
- Create: `tests/llm.test.ts`
- Create later: `lib/llm.ts`

**Step 1: Write failing tests**

Add tests for `buildUserPrompt`, `buildSystemPrompt`, `parseLlmResponse`, and `callLlm` failure handling.

**Step 2: Run test to verify it fails**

Run: `npm test tests/llm.test.ts`

Expected: FAIL because `@/lib/llm` does not exist.

**Step 3: Implement minimal `lib/llm.ts`**

Implement the OpenAI-compatible helpers from the design.

**Step 4: Run test to verify it passes**

Run: `npm test tests/llm.test.ts`

Expected: PASS.

### Task 2: Prisma Schema and Seed

**Files:**
- Modify: `prisma/schema.prisma`
- Add: `prisma/migrations/<timestamp>_add_llm_config_and_skills/migration.sql`
- Modify: `prisma/seed.ts`

**Steps:**

1. Add `LlmConfig`, `LlmSkill`, `Group` relations, and `Session` AI fields.
2. Generate a migration with Prisma or write equivalent SQL.
3. Update seed with demo LLM config and two demo Skills.
4. Run `npx prisma generate`.
5. Run `npm run prisma:seed` after migration is applied locally.

### Task 3: Domain Types and Server Actions

**Files:**
- Modify: `lib/domain.ts`
- Modify: `app/actions.ts`
- Add tests if helper extraction makes actions testable without auth.

**Steps:**

1. Add form data types from the guide.
2. Add validation schemas for LLM config, Skill, and AI Session creation.
3. Add owner-role helper inside `app/actions.ts`.
4. Implement config actions.
5. Implement Skill actions.
6. Implement `createSessionWithAiAction`.
7. Implement `regenerateSparkFieldsAction`.
8. Run `npm run test`.

### Task 4: Group Board UI

**Files:**
- Create: `components/CreateSessionDialog.tsx`
- Create: `components/LlmConfigPanel.tsx`
- Create: `components/SkillManager.tsx`
- Modify: `app/app/groups/[groupId]/page.tsx`
- Modify: `app/globals.css`

**Steps:**

1. Build the Session creation dialog with title, description, AI toggle, Skill select, error display, and pending states.
2. Build the LLM config panel with OWNER edit mode and MEMBER read-only mode.
3. Build the Skill manager with OWNER create/edit/delete and MEMBER read-only list.
4. Replace the old inline Session creation form on the group board.
5. Load `llmConfig`, `skills`, and membership role in the Server Component.
6. Add dialog CSS.

### Task 5: Session Detail AI Controls

**Files:**
- Modify: `components/WorkflowEditor.tsx`
- Modify: `app/app/groups/[groupId]/sessions/[sessionId]/page.tsx`
- Modify: `components/KanbanBoard.tsx` if AI labels are useful on cards.

**Steps:**

1. Pass `sessionId`, AI flags, raw response, description, and `hasLlmConfig` into `WorkflowEditor`.
2. Display the SPARK AI-generated badge.
3. Add regenerate button and raw response toggle.
4. Wire regeneration action and error display.
5. Fetch group LLM config existence on the Session detail page.

### Task 6: Full Verification

**Commands:**

1. `npx prisma migrate dev --name add_llm_config_and_skills`
2. `npm run prisma:seed`
3. `npm run test`
4. `npm run build`

**Manual checks:**

1. Open demo group page and confirm the create Session dialog opens.
2. Confirm LLM config and Skill management are visible for OWNER.
3. Confirm a Session detail page displays AI metadata when present.
