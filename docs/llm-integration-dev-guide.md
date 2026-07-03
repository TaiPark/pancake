# PancakeHub — LLM 智能拍摄规划接入开发文档

> **版本**: v1.0  
> **日期**: 2026-07-03  
> **目标读者**: 前端 / 后端开发工程师  
> **概述**: 为 PancakeHub 接入 LLM 能力，让群组用户可以配置自己的 LLM API Key 和模型，在创建 Session 时通过弹窗输入拍摄意图描述，LLM 借助预定义 Skill 自动生成拍摄前（SPARK）的结构化表单内容。

---

## 一、需求概述

### 1.1 用户故事

| # | 用户故事 | 价值 |
|---|---------|------|
| US-1 | 作为群组成员，我希望在群组设置中配置 LLM 的 API Key、Base URL 和模型名称，以便我的群组可以使用自己的 AI 服务 | 灵活接入不同 LLM 提供商（OpenAI、DeepSeek、自建服务等） |
| US-2 | 作为群组成员，我希望创建 Session 时有一个专属弹窗页面，可以输入拍摄意图的详细描述，以便 LLM 能获取足够上下文来生成规划 | 单行标题不够，弹窗让用户描述更充分 |
| US-3 | 作为群组成员，我希望创建 Session 后 LLM 能根据我的描述自动填写 SPARK 阶段的所有结构化字段，以便我不需要逐项手动填写 | 减少重复劳动，提高拍摄规划效率 |
| US-4 | 作为群组 OWNER，我希望可以管理群组内可用的 Skill（预设提示词模板），以便团队成员能快速选择合适的生成模板 | Skill 是 LLM 生成的"操作指南"，不同拍摄场景需要不同模板 |

### 1.2 Non-goals（不做什么）

- ❌ 不做 LLM 对话式交互（不变成 ChatGPT 界面）
- ❌ 不做跨群组的 LLM 配置共享（每个群组独立配置）
- ❌ 不做 PLAN / FEEDBACK 阶段的自动生成（只生成 SPARK 阶段）
- ❌ 不做多模型并行对比生成
- ❌ 不做 Skill 的全局市场/分享功能（只支持群组内自定义）
- ❌ 不做 LLM 配置的加密存储（API Key 存入数据库，后续可迭代加密）

### 1.3 业务流程

```
用户打开群组 → 配置 LLM（可选，也可用群组已有配置）
            → 点击「创建 Session」→ 弹窗打开
            → 输入标题 + 详细描述 + 选择 Skill
            → 点击「创建 & 生成」
            → 后端创建 Session + 调用 LLM + 填充 sparkFields
            → 弹窗关闭，看板刷新，Session 卡片出现
            → 进入 Session → SPARK 字段已被 AI 填好（用户可手动微调）
```

---

## 二、数据库变更

### 2.1 新增模型：`LlmConfig`

每个群组一个 LLM 配置，存储 API Key、模型等信息。

```prisma
model LlmConfig {
  id          String   @id @default(cuid())
  groupId     String   @unique               // 一个群组只有一个配置
  group       Group    @relation(onDelete: Cascade)
  apiKey      String                          // LLM API Key（明文存储，后续迭代加密）
  baseUrl     String   @default("https://api.openai.com/v1")  // API 基础 URL
  model      String   @default("gpt-4o")     // 模型名称
  temperature Float    @default(0.7)          // 生成温度
  maxTokens   Int      @default(4096)         // 最大输出 token 数
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([groupId])
}
```

**说明**：
- `groupId` 设为 `@unique`，确保一个群组只有一个 LLM 配置
- `baseUrl` 默认值指向 OpenAI，但用户可改为 DeepSeek（`https://api.deepseek.com/v1`）、Azure OpenAI、自建服务等
- `apiKey` 当前明文存储。**后续迭代建议**：使用 AES-256 加密存储，密钥放在环境变量中
- `model` 支持任意字符串，兼容 OpenAI、DeepSeek、Anthropic 等的模型命名

### 2.2 新增模型：`LlmSkill`

预设的提示词模板，群组 OWNER 可创建和管理。

```prisma
model LlmSkill {
  id          String   @id @default(cuid())
  groupId     String                          // 所属群组
  group       Group    @relation(onDelete: Cascade)
  name        String                          // Skill 名称，如"人像摄影规划"、"商业产品拍摄"
  description String   @default("")           // Skill 简要描述
  systemPrompt String                         // System Prompt（发给 LLM 的系统指令）
  fieldHints  Json     @default("{}")         // 字段生成提示（控制哪些字段重点生成）
  isDefault   Boolean  @default(false)        // 是否为群组默认 Skill
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([groupId])
}
```

**`fieldHints` JSON 结构示例**：
```json
{
  "theme": "请根据用户描述提炼核心主题，用 2-4 个关键词概括",
  "mood": "请推断拍摄氛围和情绪质感",
  "location": "请推荐适合该主题的拍摄地点类型",
  "gear": "请列出推荐的器材清单",
  "shotList": "请生成 5-8 个分镜描述，包含画面构图和镜头参数",
  "lightingPlan": "请设计适合该主题的灯光方案"
}
```
- `fieldHints` 为每个 SparkFields 字段提供定制化的生成引导，不提供的字段使用默认引导
- `isDefault` 标记群组的默认 Skill，创建 Session 弹窗时自动选中

### 2.3 修改模型：`Session`

新增字段，记录 Session 创建时的用户描述和 AI 生成状态。

```prisma
model Session {
  id           String       @id @default(cuid())
  groupId      String
  group        Group        @relation(onDelete: Cascade)
  title        String
  description  String       @default("")       // ✨ 新增：用户输入的拍摄意图描述
  skillId      String?                           // ✨ 新增：使用的 Skill ID
  skill        LlmSkill?    @relation(onDelete: SetNull)  // ✨ 新增：关联 Skill
  stage        SessionStage @default(SPARK)
  sparkFields  Json
  planMarkdown String       @default("")
  aiGenerated  Boolean      @default(false)    // ✨ 新增：SPARK 字段是否由 AI 生成
  aiRawResponse String      @default("")       // ✨ 新增：LLM 原始返回（便于调试和追溯）
  updatedById  String?
  updatedBy    User?        @relation("UpdatedSessions", onDelete: SetNull)
  photos       Photo[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@index([groupId, stage])
}
```

**新增字段说明**：
- `description`: 用户在创建 Session 弹窗中输入的详细拍摄意图描述，是 LLM 生成的主要输入
- `skillId`: 记录创建时使用了哪个 Skill，便于追溯和重新生成
- `aiGenerated`: 标记 SPARK 字段是否由 AI 自动填写，前端据此显示"AI 生成"标签
- `aiRawResponse`: 存储 LLM 的原始 JSON 响应，便于调试、问题排查和用户查看原始生成结果

### 2.4 修改模型：`Group`

添加关联关系。

```prisma
model Group {
  id         String   @id @default(cuid())
  name       String
  slug       String   @unique
  inviteCode String   @unique
  ownerId    String
  owner      User     @relation("GroupOwner", onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  members    GroupMember[]
  sessions   Session[]
  llmConfig  LlmConfig?           // ✨ 新增：一对一关联
  skills     LlmSkill[]           // ✨ 新增：一对多关联

  // ...其余不变
}
```

### 2.5 迁移命令

```bash
# 生成迁移文件
npx prisma migrate dev --name add_llm_config_and_skills

# 生产环境部署
npx prisma migrate deploy
```

---

## 三、后端变更

### 3.1 新增：`lib/llm.ts` — LLM 客户端抽象层

```typescript
// ──────────────────────────────────────────────
// lib/llm.ts
// ──────────────────────────────────────────────

import type { SparkFields } from "./domain";
import { parseSparkFields } from "./domain";

/**
 * LLM 调用配置
 */
export interface LlmCallConfig {
  apiKey: string;
  baseUrl: string;       // e.g. "https://api.openai.com/v1"
  model: string;         // e.g. "gpt-4o", "deepseek-chat"
  temperature: number;
  maxTokens: number;
}

/**
 * LLM 生成结果
 */
export interface LlmGenerateResult {
  sparkFields: SparkFields;   // 解析后的结构化字段
  rawResponse: string;        // LLM 原始 JSON 字符串
  modelUsed: string;          // 实际使用的模型名
}

/**
 * Skill 的字段提示
 */
export type FieldHints = Record<string, string>;

/**
 * 构建完整的 User Prompt
 * 将用户描述 + Skill 的 fieldHints 组合
 */
export function buildUserPrompt(
  description: string,
  fieldHints: FieldHints
): string {
  const defaultHints: FieldHints = {
    theme: "提炼核心主题，2-4 个关键词",
    mood: "推断拍摄氛围和情绪质感，给出 2-3 个形容词",
    objective: "明确拍摄目标，1-2 句话",
    deliverables: "列出交付物规格（格式、分辨率、数量等）",
    location: "推荐适合的拍摄地点类型和具体建议",
    callSheet: "建议拍摄日期和时间安排",
    team: "列出所需团队成员及分工",
    gear: "列出推荐器材清单（相机、镜头、灯光、道具）",
    styling: "推荐服装、化妆、造型方向",
    references: "提供可参考的作品风格和方向描述",
    shotList: "生成 5-8 个分镜描述，包含画面构图和镜头参数",
    lightingPlan: "设计适合的灯光方案（自然光/人工光/混合）",
    notes: "列出可能需要注意的问题和未定事项",
  };

  const merged = { ...defaultHints, ...fieldHints };

  const fieldInstructions = Object.entries(merged)
    .map(([field, hint]) => `  "${field}": "${hint}"`)
    .join(",\n");

  return `
你是一位专业的摄影规划助手。用户描述了他们想要进行的拍摄，请根据描述为拍摄前的各项准备工作生成详细的规划内容。

## 用户拍摄意图
${description}

## 生成要求
请按以下 JSON 格式输出，每个字段按对应的提示生成内容：
{
${fieldInstructions}
}

## 输出规则
1. 必须输出合法的 JSON，不要输出任何 JSON 以外的内容
2. 每个字段的内容应该具体、可操作，避免笼统的描述
3. 如果用户描述中某些方面信息不足，基于主题合理推断并补充
4. 分镜清单（shotList）至少给出 5 个分镜
5. 所有内容使用中文
`.trim();
}

/**
 * 构建 System Prompt
 */
export function buildSystemPrompt(skillSystemPrompt?: string): string {
  const base = `你是 PancakeHub 摄影规划助手。你的任务是根据用户的拍摄意图描述，生成一份完整的拍摄前规划文档。

输出要求：
- 必须输出合法的 JSON 对象，包含所有指定的字段
- 每个字段的值是字符串类型
- 内容要具体、专业、可操作
- 使用中文输出`;

  if (skillSystemPrompt) {
    return `${base}\n\n## 额外专业指引\n${skillSystemPrompt}`;
  }
  return base;
}

/**
 * 调用 LLM API（兼容 OpenAI API 格式）
 * 支持 OpenAI、DeepSeek、Azure OpenAI 等兼容接口
 */
export async function callLlm(
  config: LlmCallConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = `${config.baseUrl}/chat/completions`;

  const body = {
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    // 要求 JSON 输出（兼容不同提供商）
    response_format: { type: "json_object" },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000), // 60 秒超时
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API 调用失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("LLM 返回内容为空");
  }

  return content;
}

/**
 * 从 LLM 响应中解析 SparkFields
 * 安全回退：解析失败时返回默认空字段
 */
export function parseLlmResponse(rawResponse: string): SparkFields {
  try {
    const parsed = JSON.parse(rawResponse);
    // 使用 parseSparkFields 的安全合并逻辑
    // 它会将解析结果合并到默认值上，缺失字段回退到空字符串
    return parseSparkFields(parsed);
  } catch {
    // JSON 解析失败，返回默认空字段
    return parseSparkFields({});
  }
}

/**
 * 完整的 LLM 生成流程
 * 从配置到生成到解析，一步到位
 */
export async function generateSparkFields(
  config: LlmCallConfig,
  description: string,
  skillSystemPrompt: string | undefined,
  fieldHints: FieldHints
): Promise<LlmGenerateResult> {
  const systemPrompt = buildSystemPrompt(skillSystemPrompt);
  const userPrompt = buildUserPrompt(description, fieldHints);

  const rawResponse = await callLlm(config, systemPrompt, userPrompt);
  const sparkFields = parseLlmResponse(rawResponse);

  return {
    sparkFields,
    rawResponse,
    modelUsed: config.model,
  };
}
```

### 3.2 新增：`lib/domain.ts` 类型补充

在现有 `domain.ts` 中补充以下类型（不修改现有类型）：

```typescript
// ── 新增类型 ──────────────────────────────────

/** LlmConfig 的表单数据结构 */
export interface LlmConfigFormData {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/** LlmSkill 的表单数据结构 */
export interface LlmSkillFormData {
  name: string;
  description: string;
  systemPrompt: string;
  fieldHints: Record<string, string>;
  isDefault: boolean;
}

/** 创建 Session 弹窗的表单数据 */
export interface CreateSessionFormData {
  title: string;
  description: string;
  skillId: string;       // 选择的 Skill ID，空字符串表示不使用 AI
  useAi: boolean;        // 是否使用 AI 生成
}
```

### 3.3 新增 Server Actions

在 `app/actions.ts` 中新增以下 Actions：

#### 3.3.1 `saveLlmConfigAction` — 保存群组 LLM 配置

```typescript
// ── LLM 配置 ──────────────────────────────────

export async function saveLlmConfigAction(
  groupId: string,
  _prev: unknown,
  formData: FormData
) {
  const userId = currentUserId();
  await requireGroupMember(userId, groupId);

  // 验证群组 OWNER 权限（只有 OWNER 可以配置 LLM）
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership || membership.role !== "OWNER") {
    return { error: "只有群组 OWNER 可以配置 LLM" };
  }

  const apiKey = formData.get("apiKey") as string;
  const baseUrl = formData.get("baseUrl") as string;
  const model = formData.get("model") as string;
  const temperature = parseFloat(formData.get("temperature") as string);
  const maxTokens = parseInt(formData.get("maxTokens") as string, 10);

  // Zod 验证
  const schema = z.object({
    apiKey: z.string().min(1, "API Key 不能为空"),
    baseUrl: z.string().url("请输入有效的 URL"),
    model: z.string().min(1, "模型名称不能为空"),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().min(1).max(128000),
  });

  const parsed = schema.safeParse({ apiKey, baseUrl, model, temperature, maxTokens });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // Upsert：有配置则更新，没有则创建
  await prisma.llmConfig.upsert({
    where: { groupId },
    update: { apiKey, baseUrl, model, temperature, maxTokens },
    create: { groupId, apiKey, baseUrl, model, temperature, maxTokens },
  });

  revalidatePath(`/app/groups/${groupId}`);
  return { ok: true };
}
```

#### 3.3.2 `deleteLlmConfigAction` — 删除群组 LLM 配置

```typescript
export async function deleteLlmConfigAction(groupId: string) {
  const userId = currentUserId();
  await requireGroupMember(userId, groupId);

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership || membership.role !== "OWNER") {
    return { error: "只有群组 OWNER 可以删除 LLM 配置" };
  }

  await prisma.llmConfig.deleteMany({ where: { groupId } });
  revalidatePath(`/app/groups/${groupId}`);
}
```

#### 3.3.3 `createSkillAction` — 创建 Skill

```typescript
// ── LLM Skill ──────────────────────────────────

export async function createSkillAction(
  groupId: string,
  _prev: unknown,
  formData: FormData
) {
  const userId = currentUserId();
  await requireGroupMember(userId, groupId);

  // OWNER 权限检查
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership || membership.role !== "OWNER") {
    return { error: "只有群组 OWNER 可以创建 Skill" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const systemPrompt = formData.get("systemPrompt") as string;
  const fieldHintsRaw = formData.get("fieldHints") as string;
  const isDefault = formData.get("isDefault") === "on";

  const schema = z.object({
    name: z.string().min(1, "Skill 名称不能为空").max(50),
    description: z.string().max(200),
    systemPrompt: z.string().min(10, "System Prompt 至少 10 个字符").max(2000),
    fieldHints: z.string(),  // JSON 字符串，后续解析
    isDefault: z.boolean(),
  });

  // 解析 fieldHints JSON
  let fieldHints: Record<string, string> = {};
  try {
    fieldHints = JSON.parse(fieldHintsRaw || "{}");
  } catch {
    return { error: "fieldHints 必须是合法的 JSON" };
  }

  const parsed = schema.safeParse({
    name, description, systemPrompt, fieldHints: fieldHintsRaw, isDefault,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // 如果设为默认，先把其他默认取消
  if (isDefault) {
    await prisma.llmSkill.updateMany({
      where: { groupId, isDefault: true },
      data: { isDefault: false },
    });
  }

  await prisma.llmSkill.create({
    data: { groupId, name, description, systemPrompt, fieldHints, isDefault },
  });

  revalidatePath(`/app/groups/${groupId}`);
  return { ok: true };
}
```

#### 3.3.4 `updateSkillAction` — 更新 Skill

```typescript
export async function updateSkillAction(
  skillId: string,
  _prev: unknown,
  formData: FormData
) {
  // 与 createSkillAction 类似，但使用 prisma.llmSkill.update
  // 权限检查：OWNER + skill 属于该群组
  const userId = currentUserId();
  const skill = await prisma.llmSkill.findUnique({ where: { id: skillId } });
  if (!skill) return { error: "Skill 不存在" };
  await requireGroupMember(userId, skill.groupId);

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: skill.groupId } },
  });
  if (!membership || membership.role !== "OWNER") {
    return { error: "只有群组 OWNER 可以修改 Skill" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const systemPrompt = formData.get("systemPrompt") as string;
  const fieldHintsRaw = formData.get("fieldHints") as string;
  const isDefault = formData.get("isDefault") === "on";

  let fieldHints: Record<string, string> = {};
  try {
    fieldHints = JSON.parse(fieldHintsRaw || "{}");
  } catch {
    return { error: "fieldHints 必须是合法的 JSON" };
  }

  if (isDefault) {
    await prisma.llmSkill.updateMany({
      where: { groupId: skill.groupId, isDefault: true },
      data: { isDefault: false },
    });
  }

  await prisma.llmSkill.update({
    where: { id: skillId },
    data: { name, description, systemPrompt, fieldHints, isDefault },
  });

  revalidatePath(`/app/groups/${skill.groupId}`);
  return { ok: true };
}
```

#### 3.3.5 `deleteSkillAction` — 删除 Skill

```typescript
export async function deleteSkillAction(skillId: string) {
  const userId = currentUserId();
  const skill = await prisma.llmSkill.findUnique({ where: { id: skillId } });
  if (!skill) return { error: "Skill 不存在" };
  await requireGroupMember(userId, skill.groupId);

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: skill.groupId } },
  });
  if (!membership || membership.role !== "OWNER") {
    return { error: "只有群组 OWNER 可以删除 Skill" };
  }

  await prisma.llmSkill.delete({ where: { id: skillId } });
  revalidatePath(`/app/groups/${skill.groupId}`);
}
```

#### 3.3.6 `createSessionWithAiAction` — 创建 Session 并 AI 生成（核心 Action）

```typescript
// ── Session 创建（含 AI 生成）───────────────────

export async function createSessionWithAiAction(
  groupId: string,
  _prev: unknown,
  formData: FormData
) {
  const userId = currentUserId();
  await requireGroupMember(userId, groupId);

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const skillId = formData.get("skillId") as string;
  const useAi = formData.get("useAi") === "on";

  // Zod 验证
  const schema = z.object({
    title: z.string().min(1, "标题不能为空").max(100),
    description: z.string().max(2000, "描述最多 2000 字"),
    skillId: z.string(),  // 可以为空
    useAi: z.boolean(),
  });

  const parsed = schema.safeParse({ title, description, skillId, useAi });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // 获取 LLM 配置
  const llmConfig = await prisma.llmConfig.findUnique({ where: { groupId } });

  // 如果用户要使用 AI 但群组没有配置 LLM
  if (useAi && !llmConfig) {
    return { error: "群组未配置 LLM，请联系群组 OWNER 配置" };
  }

  // 获取 Skill 信息
  let skillSystemPrompt: string | undefined;
  let fieldHints: Record<string, string> = {};

  if (skillId) {
    const skill = await prisma.llmSkill.findUnique({ where: { id: skillId } });
    if (skill && skill.groupId === groupId) {
      skillSystemPrompt = skill.systemPrompt;
      fieldHints = skill.fieldHints as Record<string, string>;
    }
  }

  // AI 生成（如果启用）
  let sparkFields = parseSparkFields({}); // 默认空字段
  let aiGenerated = false;
  let aiRawResponse = "";

  if (useAi && llmConfig && description) {
    try {
      const result = await generateSparkFields(
        {
          apiKey: llmConfig.apiKey,
          baseUrl: llmConfig.baseUrl,
          model: llmConfig.model,
          temperature: llmConfig.temperature,
          maxTokens: llmConfig.maxTokens,
        },
        description,
        skillSystemPrompt,
        fieldHints
      );
      sparkFields = result.sparkFields;
      aiGenerated = true;
      aiRawResponse = result.rawResponse;
    } catch (error) {
      // LLM 调用失败，Session 照常创建但 SPARK 字段为空
      // 将错误信息存入 aiRawResponse 便于排查
      aiRawResponse = `ERROR: ${error instanceof Error ? error.message : "未知错误"}`;
      aiGenerated = false;
    }
  }

  // 创建 Session
  const session = await prisma.session.create({
    data: {
      groupId,
      title,
      description,
      skillId: skillId || null,
      sparkFields: sparkFields as any,  // Prisma Json 类型
      aiGenerated,
      aiRawResponse,
    },
  });

  revalidatePath(`/app/groups/${groupId}`);
  redirect(`/app/groups/${groupId}/sessions/${session.id}`);
}
```

#### 3.3.7 `regenerateSparkFieldsAction` — 重新生成 SPARK 字段

用户进入 Session 后可以点击"重新生成"按钮，基于现有 description 重新调用 LLM。

```typescript
export async function regenerateSparkFieldsAction(sessionId: string) {
  const userId = currentUserId();

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { group: true },
  });
  if (!session) return { error: "Session 不存在" };

  await requireGroupMember(userId, session.groupId);

  if (!session.description) {
    return { error: "Session 没有描述内容，无法生成" };
  }

  const llmConfig = await prisma.llmConfig.findUnique({
    where: { groupId: session.groupId },
  });
  if (!llmConfig) {
    return { error: "群组未配置 LLM" };
  }

  // 获取 Skill
  let skillSystemPrompt: string | undefined;
  let fieldHints: Record<string, string> = {};

  if (session.skillId) {
    const skill = await prisma.llmSkill.findUnique({
      where: { id: session.skillId },
    });
    if (skill) {
      skillSystemPrompt = skill.systemPrompt;
      fieldHints = skill.fieldHints as Record<string, string>;
    }
  }

  try {
    const result = await generateSparkFields(
      {
        apiKey: llmConfig.apiKey,
        baseUrl: llmConfig.baseUrl,
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens,
      },
      session.description,
      skillSystemPrompt,
      fieldHints
    );

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        sparkFields: result.sparkFields as any,
        aiGenerated: true,
        aiRawResponse: result.rawResponse,
      },
    });
  } catch (error) {
    return {
      error: `LLM 调用失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }

  revalidatePath(
    `/app/groups/${session.groupId}/sessions/${sessionId}`
  );
  return { ok: true };
}
```

#### 3.3.8 `testLlmConfigAction` — 测试 LLM 配置连通性

```typescript
export async function testLlmConfigAction(
  groupId: string,
  _prev: unknown,
  formData: FormData
) {
  const userId = currentUserId();
  await requireGroupMember(userId, groupId);

  const apiKey = formData.get("apiKey") as string;
  const baseUrl = formData.get("baseUrl") as string;
  const model = formData.get("model") as string;

  try {
    // 发送一个简单测试请求
    const response = await callLlm(
      { apiKey, baseUrl, model, temperature: 0.1, maxTokens: 50 },
      "你是一个测试助手。",
      "请回复'连接成功'。"
    );
    return { ok: true, message: `连接成功，模型: ${model}` };
  } catch (error) {
    return {
      error: `连接失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}
```

---

## 四、前端变更

### 4.1 新增组件：`CreateSessionDialog`（创建 Session 弹窗）

这是本次改造的核心前端组件。**关键**：创建 Session 应该是一个弹窗（Dialog / Modal），因为用户需要输入较长的描述文字。

**文件路径**: `components/CreateSessionDialog.tsx`

**组件结构**:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSessionWithAiAction } from "@/app/actions";

interface SkillOption {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

interface CreateSessionDialogProps {
  groupId: string;
  skills: SkillOption[];
  hasLlmConfig: boolean;   // 群组是否已配置 LLM
}

export function CreateSessionDialog({
  groupId,
  skills,
  hasLlmConfig,
}: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 弹窗状态
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState(
    skills.find((s) => s.isDefault)?.id || ""
  );
  const [useAi, setUseAi] = useState(hasLlmConfig);

  const handleSubmit = (formData: FormData) => {
    // 使用 AI 时，手动附加字段（因为弹窗不是原生 form）
    if (useAi) formData.set("useAi", "on");
    if (selectedSkillId) formData.set("skillId", selectedSkillId);

    startTransition(async () => {
      const result = await createSessionWithAiAction(groupId, null, formData);
      if (result?.error) {
        setError(result.error);
      }
      // 成功时 Action 内部已 redirect，无需手动关闭
    });
  };

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="button button-primary"
      >
        + 创建 Session
      </button>

      {/* 弹窗 */}
      {open && (
        <div className="dialog-overlay" onClick={() => !isPending && setOpen(false)}>
          <div className="dialog-content panel" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">创建拍摄 Session</h2>

            {error && (
              <div className="mb-4 p-3 rounded bg-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form action={handleSubmit}>
              {/* 标题 */}
              <div className="field-group mb-4">
                <label className="block text-sm text-[var(--muted)] mb-1">
                  Session 标题
                </label>
                <input
                  name="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="field w-full"
                  placeholder="例如：秋日公园人像"
                  required
                  maxLength={100}
                />
              </div>

              {/* 拍摄意图描述 */}
              <div className="field-group mb-4">
                <label className="block text-sm text-[var(--muted)] mb-1">
                  拍摄意图描述
                  {useAi && (
                    <span className="text-[var(--accent)] ml-1">
                      （AI 将基于此描述生成拍摄规划）
                    </span>
                  )}
                </label>
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="field w-full min-h-[160px] resize-y"
                  placeholder="描述你想要拍摄的内容：主题、风格、地点、期望效果等..."
                  maxLength={2000}
                />
                <div className="text-xs text-[var(--muted)] mt-1 text-right">
                  {description.length} / 2000
                </div>
              </div>

              {/* AI 生成开关 */}
              {hasLlmConfig && (
                <div className="field-group mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="useAi"
                      checked={useAi}
                      onChange={(e) => setUseAi(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <label htmlFor="useAi" className="text-sm">
                      使用 AI 自动生成拍摄前规划
                    </label>
                  </div>
                  {!useAi && (
                    <p className="text-xs text-[var(--muted)] mt-1">
                      关闭后 SPARK 字段将为空，需手动填写
                    </p>
                  )}
                </div>
              )}

              {!hasLlmConfig && (
                <div className="mb-4 p-3 rounded bg-[var(--surface-soft)] text-sm text-[var(--muted)]">
                  群组尚未配置 LLM，SPARK 字段需手动填写。请联系群组 OWNER 配置 AI 服务。
                </div>
              )}

              {/* Skill 选择（仅在启用 AI 时显示） */}
              {useAi && skills.length > 0 && (
                <div className="field-group mb-4">
                  <label className="block text-sm text-[var(--muted)] mb-1">
                    选择 Skill（生成模板）
                  </label>
                  <select
                    value={selectedSkillId}
                    onChange={(e) => setSelectedSkillId(e.target.value)}
                    className="field w-full"
                  >
                    <option value="">— 默认（无特定 Skill）—</option>
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                        {skill.isDefault ? " ★" : ""}
                      </option>
                    ))}
                  </select>
                  {selectedSkillId && (
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {skills.find((s) => s.id === selectedSkillId)?.description}
                    </p>
                  )}
                </div>
              )}

              {/* 提交按钮 */}
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="button button-primary flex-1"
                  disabled={isPending || !title.trim()}
                >
                  {isPending
                    ? useAi ? "正在创建 & AI 生成中..." : "正在创建..."
                    : useAi ? "创建 & AI 生成" : "创建 Session"
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="button button-secondary"
                  disabled={isPending}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

### 4.2 弹窗 CSS 样式

在 `app/globals.css` 中追加：

```css
/* ── Dialog / Modal 弹窗 ────────────────────── */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease;
}

.dialog-content {
  width: min(560px, 90vw);
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 4.3 新增组件：`LlmConfigPanel`（LLM 配置面板）

**文件路径**: `components/LlmConfigPanel.tsx`

用于群组 OWNER 配置 LLM 的 API Key、Base URL、模型等。

```typescript
"use client";

import { useState, useTransition } from "react";
import {
  saveLlmConfigAction,
  deleteLlmConfigAction,
  testLlmConfigAction,
} from "@/app/actions";

interface LlmConfigPanelProps {
  groupId: string;
  existingConfig?: {
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
  } | null;
  isOwner: boolean;
}

export function LlmConfigPanel({
  groupId,
  existingConfig,
  isOwner,
}: LlmConfigPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string; message?: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  if (!isOwner) {
    return (
      <div className="panel p-4">
        <p className="text-[var(--muted)]">
          {existingConfig
            ? "群组已配置 LLM，可在创建 Session 时使用 AI 生成。"
            : "群组尚未配置 LLM，请联系群组 OWNER 配置。"}
        </p>
      </div>
    );
  }

  const handleTest = async (formData: FormData) => {
    startTransition(async () => {
      const res = await testLlmConfigAction(groupId, null, formData);
      setResult(res);
    });
  };

  const handleDelete = async () => {
    startTransition(async () => {
      await deleteLlmConfigAction(groupId);
    });
  };

  return (
    <div className="panel p-4">
      <h3 className="text-lg font-semibold mb-4">LLM 配置</h3>

      {result?.error && (
        <div className="mb-3 p-3 rounded bg-red-500/20 text-red-400 text-sm">
          {result.error}
        </div>
      )}
      {result?.ok && (
        <div className="mb-3 p-3 rounded bg-emerald-500/20 text-emerald-400 text-sm">
          {result.message}
        </div>
      )}

      <form action={saveLlmConfigAction.bind(null, groupId, null)} className="space-y-4">
        {/* API Key */}
        <div className="field-group">
          <label className="block text-sm text-[var(--muted)] mb-1">API Key</label>
          <div className="relative">
            <input
              name="apiKey"
              type={showKey ? "text" : "password"}
              className="field w-full pr-10"
              defaultValue={existingConfig?.apiKey || ""}
              required
              placeholder="sk-..."
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]"
            >
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
        </div>

        {/* Base URL */}
        <div className="field-group">
          <label className="block text-sm text-[var(--muted)] mb-1">
            API Base URL
          </label>
          <input
            name="baseUrl"
            type="url"
            className="field w-full"
            defaultValue={existingConfig?.baseUrl || "https://api.openai.com/v1"}
            required
            placeholder="https://api.openai.com/v1"
          />
          <p className="text-xs text-[var(--muted)] mt-1">
            支持 OpenAI、DeepSeek、Azure OpenAI 等兼容接口
          </p>
        </div>

        {/* Model */}
        <div className="field-group">
          <label className="block text-sm text-[var(--muted)] mb-1">模型名称</label>
          <input
            name="model"
            type="text"
            className="field w-full"
            defaultValue={existingConfig?.model || "gpt-4o"}
            required
            placeholder="gpt-4o / deepseek-chat / claude-3-opus-..."
          />
        </div>

        {/* Temperature */}
        <div className="field-group">
          <label className="block text-sm text-[var(--muted)] mb-1">
            Temperature（生成温度）
          </label>
          <input
            name="temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            className="field w-32"
            defaultValue={existingConfig?.temperature || 0.7}
          />
        </div>

        {/* Max Tokens */}
        <div className="field-group">
          <label className="block text-sm text-[var(--muted)] mb-1">
            Max Tokens（最大输出长度）
          </label>
          <input
            name="maxTokens"
            type="number"
            min="1"
            max="128000"
            className="field w-32"
            defaultValue={existingConfig?.maxTokens || 4096}
          />
        </div>

        {/* 保存 + 测试按钮 */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="button button-primary"
            disabled={isPending}
          >
            {isPending ? "保存中..." : "保存配置"}
          </button>
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector("form")!;
              const fd = new FormData(form);
              startTransition(async () => {
                const res = await testLlmConfigAction(groupId, null, fd);
                setResult(res);
              });
            }}
            className="button button-secondary"
            disabled={isPending}
          >
            测试连接
          </button>
          {existingConfig && (
            <button
              type="button"
              onClick={handleDelete}
              className="button button-danger"
              disabled={isPending}
            >
              删除配置
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

### 4.4 新增组件：`SkillManager`（Skill 管理面板）

**文件路径**: `components/SkillManager.tsx`

用于群组 OWNER 创建、编辑、删除 Skill。

```typescript
"use client";

import { useState, useTransition } from "react";
import {
  createSkillAction,
  updateSkillAction,
  deleteSkillAction,
} from "@/app/actions";

interface Skill {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  fieldHints: Record<string, string>;
  isDefault: boolean;
}

interface SkillManagerProps {
  groupId: string;
  skills: Skill[];
  isOwner: boolean;
}

export function SkillManager({ groupId, skills, isOwner }: SkillManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) {
    return (
      <div className="panel p-4">
        <h3 className="text-lg font-semibold mb-2">Skill 列表</h3>
        {skills.length === 0 ? (
          <p className="text-[var(--muted)]">群组暂无 Skill</p>
        ) : (
          <ul className="space-y-2">
            {skills.map((skill) => (
              <li key={skill.id} className="text-sm">
                <span className="font-medium">{skill.name}</span>
                {skill.isDefault && <span className="text-[var(--accent)] ml-1">★ 默认</span>}
                <p className="text-[var(--muted)]">{skill.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // OWNER 视图：可创建/编辑/删除
  // 包含 Skill 表单（name, description, systemPrompt, fieldHints JSON 编辑器, isDefault）
  // 具体实现参照 LlmConfigPanel 的模式
  // ...（完整代码结构同上，此处省略重复的表单布局代码）

  return (
    <div className="panel p-4">
      <h3 className="text-lg font-semibold mb-4">
        Skill 管理
      </h3>

      {/* Skill 列表 */}
      {skills.map((skill) => (
        <div key={skill.id} className="flex items-center justify-between p-2 border-b border-[var(--line)]">
          <div>
            <span className="font-medium">{skill.name}</span>
            {skill.isDefault && <span className="text-[var(--accent)] ml-1">★ 默认</span>}
            <p className="text-xs text-[var(--muted)]">{skill.description}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditingId(skill.id)} className="text-xs text-[var(--accent)]">
              编辑
            </button>
            <button
              onClick={() => startTransition(async () => {
                await deleteSkillAction(skill.id);
              })}
              className="text-xs text-red-400"
            >
              删除
            </button>
          </div>
        </div>
      ))}

      {/* 创建/编辑 Skill 表单（弹窗或内联展开） */}
      {/* 使用 dialog-overlay 样式，与 CreateSessionDialog 一致 */}
      {/* 表单字段：name, description, systemPrompt (textarea), fieldHints (JSON editor textarea), isDefault (checkbox) */}
      {/* ... 完整实现 */}
    </div>
  );
}
```

### 4.5 修改页面：群组看板页 (`app/app/groups/[groupId]/page.tsx`)

**改动要点**：

1. **替换创建 Session 表单**：原来的简单 `<form>` 替换为 `CreateSessionDialog` 组件
2. **新增 LLM 配置入口**：在群组看板页添加一个「⚙ LLM 配置」按钮，点击后展开/跳转到 LLM 配置面板
3. **新增 Skill 管理入口**：OWNER 可以看到「🤖 Skill 管理」按钮

```typescript
// ── 修改 app/app/groups/[groupId]/page.tsx ────

import { CreateSessionDialog } from "@/components/CreateSessionDialog";
import { LlmConfigPanel } from "@/components/LlmConfigPanel";
import { SkillManager } from "@/components/SkillManager";

export default async function GroupPage({ params }) {
  // ...现有逻辑...

  // ✨ 新增查询：获取 LLM 配置和 Skill 列表
  const llmConfig = await prisma.llmConfig.findUnique({
    where: { groupId: group.id },
  });

  const skills = await prisma.llmSkill.findMany({
    where: { groupId: group.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  // ✨ 判断是否为 OWNER
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });
  const isOwner = membership?.role === "OWNER";

  return (
    <AppShell user={user}>
      <div className="...">
        {/* 现有看板标题区 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <div className="flex gap-3">
            {/* ✨ 替换原来的创建 Session 表单 */}
            <CreateSessionDialog
              groupId={group.id}
              skills={skills.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                isDefault: s.isDefault,
              }))}
              hasLlmConfig={!!llmConfig}
            />

            {/* ✨ 新增：LLM 配置按钮（OWNER 专属） */}
            {isOwner && (
              <button
                onClick={() => {/* 切换显示 LLM 配置面板 */}
                  // 实际由客户端状态控制，这里需要将页面拆分为
                  // Server Component + Client Component wrapper
                }}
                className="button button-secondary"
              >
                ⚙ AI 配置
              </button>
            )}
          </div>
        </div>

        {/* ✨ 新增：LLM 配置面板（可折叠/弹窗） */}
        {/* LlmConfigPanel 和 SkillManager 在此渲染 */}
        {/* ... */}

        {/* 现有 KanbanBoard */}
        <KanbanBoard group={group} sessions={sessions} userId={userId} />
      </div>
    </AppShell>
  );
}
```

> **注意**：由于群组看板页目前是 Server Component，引入 `CreateSessionDialog`（Client Component）可以直接使用。但 LLM 配置的交互（展开/折叠面板）需要客户端状态控制。**推荐方案**：将群组页面拆分为一个 Server Component 页壳 + 一个 `GroupPageClient` Client Component 内壳，后者管理"配置面板是否展开"的状态。

### 4.6 修改组件：`WorkflowEditor.tsx`

**改动要点**：

1. **AI 生成标签**：当 `aiGenerated === true` 时，在 SPARK 阶段卡片上显示"✨ AI 生成"标记
2. **重新生成按钮**：在 SPARK 阶段表单区域顶部添加"🔄 重新生成"按钮
3. **查看原始响应**：添加"查看 AI 原始输出"的展开按钮（从 `aiRawResponse` 读取）

```typescript
// ── WorkflowEditor.tsx 改动 ──────────────────

// Props 新增
interface WorkflowEditorProps {
  sessionId: string;
  groupId: string;
  sparkFields: SparkFields;
  planMarkdown: string;
  stage: SessionStage;
  aiGenerated: boolean;      // ✨ 新增
  aiRawResponse: string;     // ✨ 新增
  hasLlmConfig: boolean;     // ✨ 新增
  description: string;       // ✨ 新增：用于重新生成
}

export function WorkflowEditor({
  sessionId,
  groupId,
  sparkFields,
  planMarkdown,
  stage,
  aiGenerated,       // ✨
  aiRawResponse,      // ✨
  hasLlmConfig,       // ✨
  description,        // ✨
}: WorkflowEditorProps) {
  // ...现有逻辑...

  const [showRawResponse, setShowRawResponse] = useState(false);
  const [isRegenerating, startRegenerate] = useTransition();

  return (
    <div className="...">
      {/* 阶段卡片区域 */}
      {sections.map((section) => (
        <div key={section.stage} className="workflow-card ...">
          <div className="flex items-center justify-between">
            <span>{stageLabel(section.stage)}</span>
            {/* ✨ 新增：AI 生成标签 */}
            {section.stage === "SPARK" && aiGenerated && (
              <span className="text-xs text-[var(--accent)]">
                ✨ AI 生成
              </span>
            )}
          </div>
          {/* 填写进度 */}
          {/* ...现有逻辑 */}
        </div>
      ))}

      {/* ✨ 新增：SPARK 阶段专属操作区 */}
      {activeStage === "SPARK" && hasLlmConfig && description && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded bg-[var(--surface-soft)]">
          <button
            onClick={() => {
              startRegenerate(async () => {
                await regenerateSparkFieldsAction(sessionId);
              });
            }}
            className="button button-secondary text-sm"
            disabled={isRegenerating}
          >
            {isRegenerating ? "正在重新生成..." : "🔄 重新生成"}
          </button>
          {aiRawResponse && (
            <button
              onClick={() => setShowRawResponse(!showRawResponse)}
              className="text-xs text-[var(--muted)]"
            >
              {showRawResponse ? "隐藏" : "查看"} AI 原始输出
            </button>
          )}
        </div>
      )}

      {/* ✨ 新增：原始输出展示区 */}
      {showRawResponse && aiRawResponse && (
        <div className="mb-4 p-3 rounded bg-[var(--surface)] text-xs text-[var(--muted)] overflow-auto max-h-[300px]">
          <pre>{aiRawResponse}</pre>
        </div>
      )}

      {/* 现有表单字段 */}
      {/* ... */}
    </div>
  );
}
```

### 4.7 修改 Session 详情页 (`app/app/groups/[groupId]/sessions/[sessionId]/page.tsx`)

**改动要点**：将新增的 `aiGenerated`、`aiRawResponse`、`hasLlmConfig`、`description` 等数据传递给 `WorkflowEditor`。

```typescript
// ── Session 详情页改动 ──────────────────────

// 新增查询
const llmConfig = await prisma.llmConfig.findUnique({
  where: { groupId: group.id },
});

// 传递给 WorkflowEditor
<WorkflowEditor
  sessionId={session.id}
  groupId={group.id}
  sparkFields={parsedSparkFields}
  planMarkdown={session.planMarkdown}
  stage={session.stage}
  aiGenerated={session.aiGenerated}          // ✨
  aiRawResponse={session.aiRawResponse}      // ✨
  hasLlmConfig={!!llmConfig}                 // ✨
  description={session.description}          // ✨
/>
```

---

## 五、前后端联动对照表

### 5.1 完整的 Server Actions 与前端组件映射

| Server Action | 前端触发位置 | 前端组件 | 传入参数 |
|--------------|-------------|---------|---------|
| `saveLlmConfigAction` | LLM 配置面板 → 保存按钮 | `LlmConfigPanel` | `groupId` + FormData (apiKey, baseUrl, model, temperature, maxTokens) |
| `deleteLlmConfigAction` | LLM 配置面板 → 删除按钮 | `LlmConfigPanel` | `groupId` |
| `testLlmConfigAction` | LLM 配置面板 → 测试按钮 | `LlmConfigPanel` | `groupId` + FormData (apiKey, baseUrl, model) |
| `createSkillAction` | Skill 管理 → 创建 Skill | `SkillManager` | `groupId` + FormData (name, description, systemPrompt, fieldHints, isDefault) |
| `updateSkillAction` | Skill 管理 → 编辑 Skill | `SkillManager` | `skillId` + FormData |
| `deleteSkillAction` | Skill 管理 → 删除按钮 | `SkillManager` | `skillId` |
| `createSessionWithAiAction` | 创建 Session 弹窗 → 提交 | `CreateSessionDialog` | `groupId` + FormData (title, description, skillId, useAi) |
| `regenerateSparkFieldsAction` | Session 详情 → 重新生成按钮 | `WorkflowEditor` | `sessionId` |

### 5.2 数据流向图

```
前端                              后端                              数据库
─────                            ────                              ────

LlmConfigPanel
  ├─ save → saveLlmConfigAction ─→ upsert LlmConfig ─→ prisma
  ├─ test → testLlmConfigAction ─→ callLlm() ─→ 外部 API
  └─ delete → deleteLlmConfigAction ─→ delete LlmConfig ─→ prisma

SkillManager
  ├─ create → createSkillAction ─→ create LlmSkill ─→ prisma
  ├─ update → updateSkillAction ─→ update LlmSkill ─→ prisma
  └─ delete → deleteSkillAction ─→ delete LlmSkill ─→ prisma

CreateSessionDialog
  └─ submit → createSessionWithAiAction
              ├─ 读取 LlmConfig ─← prisma
              ├─ 读取 LlmSkill  ─← prisma
              ├─ callLlm()       ─→ 外部 LLM API ─→ 返回 JSON
              ├─ parseLlmResponse()
              └─ create Session  ─→ prisma (含 aiGenerated, aiRawResponse)

WorkflowEditor
  └─ regenerate → regenerateSparkFieldsAction
                  ├─ 读取 Session.description ─← prisma
                  ├─ 读取 LlmConfig ─← prisma
                  ├─ 读取 LlmSkill  ─← prisma
                  ├─ callLlm()       ─→ 外部 LLM API
                  └─ update Session.sparkFields ─→ prisma
```

---

## 六、新增 API 路由（可选）

> 说明：核心逻辑通过 Server Actions 实现，无需新增 API 路由。但以下场景**可能需要** API 路由：

### 6.1 `POST /api/llm/test` — LLM 连通性测试（如果需要在客户端独立调用）

如果 `testLlmConfigAction` 的 Server Action 形式不方便（比如需要在保存前实时测试），可以改用 API 路由：

```typescript
// app/api/llm/test/route.ts
import { auth } from "@/lib/auth";
import { callLlm } from "@/lib/llm";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未认证" }, { status: 401 });
  }

  const { apiKey, baseUrl, model } = await request.json();

  try {
    const result = await callLlm(
      { apiKey, baseUrl, model, temperature: 0.1, maxTokens: 50 },
      "你是一个测试助手。",
      "请回复'连接成功'。"
    );
    return Response.json({ ok: true, message: `连接成功，模型: ${model}` });
  } catch (error) {
    return Response.json({
      error: `连接失败: ${error instanceof Error ? error.message : "未知错误"}`,
    }, { status: 400 });
  }
}
```

---

## 七、环境变量变更

在 `.env.example` 中新增（不新增必须的环境变量，LLM 配置由用户在群组设置中输入）：

```bash
# ── LLM 相关（可选）───────────────────────────
# 如果需要 API Key 加密存储，后续迭代使用以下环境变量
# LLM_KEY_ENCRYPTION_KEY=     # AES-256 加密密钥（32字节十六进制）
```

当前版本不需要新增环境变量，所有 LLM 配置存储在数据库中由用户输入。

---

## 八、种子数据变更

在 `prisma/seed.ts` 中新增演示数据：

```typescript
// ✨ 新增：演示 LLM 配置
await prisma.llmConfig.create({
  data: {
    groupId: demoGroup.id,
    apiKey: "demo-key-placeholder",   // 占位，不使用真实 Key
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 4096,
  },
});

// ✨ 新增：演示 Skill
await prisma.llmSkill.create({
  data: {
    groupId: demoGroup.id,
    name: "人像摄影规划",
    description: "针对人像摄影场景的规划模板，侧重情绪、造型和分镜",
    systemPrompt: "你是专业的人像摄影规划助手。请特别关注拍摄对象的情绪表达、造型风格和分镜构图。人像摄影的核心是人物与环境的融合。",
    fieldHints: {
      theme: "提炼人像拍摄的核心主题",
      mood: "重点描述人物情绪和画面质感",
      styling: "详细规划服装、化妆、发型造型",
      shotList: "生成 6-8 个分镜，每个包含人物姿态和构图",
      lightingPlan: "针对人像设计柔光/硬光方案",
    },
    isDefault: true,
  },
});

await prisma.llmSkill.create({
  data: {
    groupId: demoGroup.id,
    name: "商业产品拍摄",
    description: "针对商业产品拍摄场景，侧重产品展示和品牌调性",
    systemPrompt: "你是商业产品拍摄规划助手。请特别关注产品特征展示、品牌视觉调性和最终交付规格。商业拍摄需要精确的灯光控制和后期要求。",
    fieldHints: {
      objective: "明确商业拍摄目标：品牌宣传/产品展示/电商详情",
      deliverables: "详细列出交付规格：分辨率、格式、数量、后期要求",
      gear: "列出产品拍摄专用器材：微距镜头、闪光灯、柔光箱",
      references: "提供同类产品的优秀拍摄案例风格方向",
    },
    isDefault: false,
  },
});
```

---

## 九、开发顺序建议

按以下顺序开发，每步完成后可独立验证：

| 阶段 | 任务 | 预估 | 可验证点 |
|------|------|------|---------|
| **P0** | 1. 数据库迁移（新增 LlmConfig、LlmSkill，修改 Session） | 0.5h | `prisma migrate dev` 成功，数据库表创建 |
| **P0** | 2. `lib/llm.ts` LLM 客户端 | 1h | 单元测试：`callLlm()` 可成功调用 OpenAI API |
| **P0** | 3. `saveLlmConfigAction` + `testLlmConfigAction` + `LlmConfigPanel` | 1.5h | 界面上可配置 LLM，测试连接成功 |
| **P1** | 4. `createSkillAction` + `updateSkillAction` + `deleteSkillAction` + `SkillManager` | 1.5h | 界面上可创建/编辑/删除 Skill |
| **P1** | 5. 弹窗 CSS + `CreateSessionDialog` 组件 | 1.5h | 弹窗可打开，表单可填写 |
| **P2** | 6. `createSessionWithAiAction` — 创建 + AI 生成 | 2h | 创建 Session 后 SPARK 字段被 AI 填充 |
| **P2** | 7. 修改群组看板页 — 替换创建入口 + LLM 配置入口 | 1h | 看板页使用弹窗创建，可进入 LLM 配置 |
| **P3** | 8. `regenerateSparkFieldsAction` + WorkflowEditor 改造 | 1h | Session 内可重新生成，显示 AI 标签 |
| **P3** | 9. 种子数据更新 | 0.5h | `prisma db seed` 成功，演示数据包含 LLM 配置和 Skill |

---

## 十、关键技术细节

### 10.1 LLM API 兼容性

项目采用 **OpenAI Chat Completions API 格式**作为标准接口。该格式被以下提供商兼容：

| 提供商 | Base URL | 模型示例 | 兼容性 |
|--------|----------|---------|--------|
| OpenAI | `https://api.openai.com/v1` | gpt-4o, gpt-4o-mini | 原生 |
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat, deepseek-reasoner | 完全兼容 |
| Azure OpenAI | `{endpoint}/openai/deployments/{deployment}/chat/completions?api-version=2024-02-15-preview` | 自定义部署名 | 需适配 URL 格式 |
| Anthropic | — | claude-3-opus, claude-3.5-sonnet | 不兼容，需单独适配 |
| 自建服务 | 自定义 URL | 自定义 | 需兼容 OpenAI 格式 |

**Anthropic 适配**（后续迭代）：如果需要支持 Claude，需要单独写一个 `callAnthropic()` 函数，使用 Anthropic Messages API 格式，并在 `LlmConfig` 中增加 `provider` 字段区分。

### 10.2 `response_format: { type: "json_object" }`

此参数要求 LLM 输出合法 JSON。**兼容性**：
- OpenAI gpt-4o / gpt-4-turbo：完全支持
- DeepSeek：支持
- 其他提供商：不一定支持

**兜底方案**：如果提供商不支持 `response_format`，在 `callLlm()` 中移除该参数，并在 System Prompt 中强约束"必须输出 JSON"。`parseLlmResponse()` 已有安全回退逻辑，解析失败时返回空字段。

### 10.3 API Key 安全

当前版本 API Key **明文存储**在数据库中。这适用于：
- 内部团队使用的部署环境
- 演示和测试

**后续迭代建议**：
1. 在 `LlmConfig` 中加密存储 API Key
2. 使用 AES-256-GCM 加密，密钥从环境变量 `LLM_KEY_ENCRYPTION_KEY` 读取
3. 前端传输时 API Key 通过 HTTPS 保护

### 10.4 超时与错误处理

| 场景 | 处理方式 |
|------|---------|
| LLM 调用超时（>60s） | `AbortSignal.timeout(60000)` 中断请求，Session 照常创建但 SPARK 为空 |
| LLM 返回非 JSON | `parseLlmResponse()` 安全回退到默认空字段 |
| API Key 无效 | `callLlm()` 抛出 Error，Action 捕获后显示错误信息 |
| 网络错误 | 同上，Action 层面捕获并返回 `{ error }` |
| 群组无 LLM 配置 | `createSessionWithAiAction` 返回 `{ error: "群组未配置 LLM" }` |

### 10.5 权限矩阵

| 操作 | OWNER | MEMBER |
|------|-------|--------|
| 配置 LLM | ✅ | ❌ |
| 删除 LLM 配置 | ✅ | ❌ |
| 创建 Skill | ✅ | ❌ |
| 编辑 Skill | ✅ | ❌ |
| 删除 Skill | ✅ | ❌ |
| 使用 AI 创建 Session | ✅ | ✅（需群组已配置 LLM） |
| 重新生成 SPARK | ✅ | ✅（需群组已配置 LLM） |
| 查看 AI 原始输出 | ✅ | ✅ |

### 10.6 性能考量

- LLM 调用是**同步阻塞**操作，创建 Session 时需等待 LLM 返回
- 典型延迟：gpt-4o 约 5-15 秒，deepseek-chat 约 3-10 秒
- 前端使用 `useTransition` 保持 UI 可响应（显示 "正在生成中..."）
- 后续迭代可考虑**异步生成**：先创建 Session，后台调用 LLM，完成后通知前端刷新

---

## 十一、测试要点

### 11.1 后端测试

```typescript
// tests/llm.test.ts — 使用 Vitest

describe("lib/llm", () => {
  test("buildUserPrompt 包含用户描述和字段提示", () => {
    const prompt = buildUserPrompt("我想拍一组秋天公园的人像", {});
    expect(prompt).toContain("秋天公园的人像");
    expect(prompt).toContain("theme");
    expect(prompt).toContain("shotList");
  });

  test("parseLlmResponse 正常解析", () => {
    const raw = JSON.stringify({
      theme: "秋日暖阳人像",
      mood: "温暖、宁静、怀旧",
      // ...部分字段
    });
    const result = parseLlmResponse(raw);
    expect(result.theme).toBe("秋日暖阳人像");
    expect(result.mood).toBe("温暖、宁静、怀旧");
    // 缺失字段应回退为空字符串
    expect(result.gear).toBe("");
  });

  test("parseLlmResponse 解析失败回退", () => {
    const result = parseLlmResponse("这不是JSON");
    // 所有字段应为空字符串
    expect(result.theme).toBe("");
  });

  test("callLlm 调用失败抛出 Error", async () => {
    // mock fetch 返回 401
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, text: () => "Unauthorized" });
    await expect(callLlm(config, "sys", "user")).rejects.toThrow("LLM API 调用失败");
  });
});
```

### 11.2 前端测试

- `CreateSessionDialog`：弹窗打开/关闭、表单提交、错误展示
- `LlmConfigPanel`：OWNER 视图 vs MEMBER 视图、保存/测试/删除
- `SkillManager`：创建/编辑/删除 Skill
- `WorkflowEditor`：AI 标签显示、重新生成按钮、原始输出展开

---

## 十二、后续迭代方向

| 优先级 | 方向 | 说明 |
|--------|------|------|
| P1 | API Key 加密存储 | AES-256 加密，环境变量管理密钥 |
| P1 | 异步生成模式 | Session 先创建，LLM 后台调用，前端轮询/WebSocket 获取结果 |
| P2 | Anthropic/Claude 支持 | `LlmConfig` 增加 `provider` 字段，`lib/llm.ts` 增加 `callAnthropic()` |
| P2 | PLAN 阶段 AI 辅助 | 根据 SPARK 字段自动生成拍摄执行文档 Markdown |
| P2 | Skill 全局模板库 | 预置一批官方 Skill 模板，群组可一键导入 |
| P3 | AI 对话模式 | 在 Session 内支持对话式追问，逐步完善规划 |
| P3 | 多模型对比 | 一次生成调用多个模型，用户选择最佳结果 |
