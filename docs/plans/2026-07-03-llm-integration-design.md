# LLM Integration Design

## Goal

Implement the behavior described in `docs/llm-integration-dev-guide.md`: group-level LLM settings and skills, AI-assisted Session creation, generated SPARK fields, and regeneration from the Session workflow page.

## Scope

The first implementation is the synchronous generation MVP from the guide. A Session creation request may wait for the LLM response, then redirects to the new Session. If the LLM call fails during creation, the Session is still created with empty SPARK fields and the error is stored in `aiRawResponse` for debugging.

This implementation does not add optional API routes, encrypted API key storage, async job queues, cross-group config sharing, PLAN or FEEDBACK generation, global Skill marketplaces, or Anthropic-specific protocol support.

## Data Model

Add `LlmConfig` with one row per group and `LlmSkill` with many rows per group. `Group` receives `llmConfig` and `skills` relations. `Session` receives `description`, `skillId`, `skill`, `aiGenerated`, and `aiRawResponse`.

The schema follows the guide with one Prisma adjustment: relations include explicit `fields` and `references`, and `Session.skill` uses `onDelete: SetNull`.

## Backend

Add `lib/llm.ts` as an OpenAI-compatible Chat Completions client. It builds system and user prompts, merges default field hints with Skill hints, calls `/chat/completions`, and parses JSON into `SparkFields` using the existing defensive `parseSparkFields` helper.

Add Server Actions for:

- Saving, deleting, and testing LLM config.
- Creating, updating, and deleting Skills.
- Creating Sessions with optional AI generation.
- Regenerating SPARK fields from an existing Session description and Skill.

OWNER-only actions validate group membership and role. Members can use AI generation when a group config exists.

## Frontend

Replace the existing inline Session creation form on the group board with `CreateSessionDialog`. The dialog collects a title, a detailed description, an AI toggle, and a Skill selection.

Add `LlmConfigPanel` and `SkillManager` in the group board page. The group page remains a Server Component for data loading, with focused Client Components for interactive panels.

Update `WorkflowEditor` to show the AI-generated marker on the SPARK card, expose regeneration when there is a description and group LLM config, and allow raw AI output inspection.

## Testing

Add unit tests for `lib/llm.ts` prompt building, parsing, and failed API calls. Add domain tests for LLM form parsing helpers where helpful. Preserve the existing workflow, permission, invite, and brand tests. Final verification must include `npm run test`, Prisma generation or migration validation, and `npm run build`.
