import type { SparkFields } from "@/lib/domain";
import { parseSparkFields } from "@/lib/domain";

export type LlmCallConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

export type LlmGenerateResult = {
  sparkFields: SparkFields;
  rawResponse: string;
  modelUsed: string;
};

export type FieldHints = Record<string, string>;

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
  notes: "列出可能需要注意的问题和未定事项"
};

export function buildUserPrompt(description: string, fieldHints: FieldHints): string {
  const merged = Object.fromEntries(
    Object.entries(defaultHints).map(([field, hint]) => [field, fieldHints[field] ?? hint])
  );
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

export function buildSystemPrompt(skillSystemPrompt?: string): string {
  const base = `你是 PancakeHub 摄影规划助手。你的任务是根据用户的拍摄意图描述，生成一份完整的拍摄前规划文档。

输出要求：
- 必须输出合法的 JSON 对象，包含所有指定的字段
- 每个字段的值是字符串类型
- 内容要具体、专业、可操作
- 使用中文输出`;

  if (!skillSystemPrompt) {
    return base;
  }

  return `${base}\n\n## 额外专业指引\n${skillSystemPrompt}`;
}

export async function callLlm(config: LlmCallConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API 调用失败: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("LLM 返回内容为空");
  }

  return content;
}

export function parseLlmResponse(rawResponse: string): SparkFields {
  try {
    return parseSparkFields(JSON.parse(rawResponse));
  } catch {
    return parseSparkFields({});
  }
}

export async function generateSparkFields(
  config: LlmCallConfig,
  description: string,
  skillSystemPrompt: string | undefined,
  fieldHints: FieldHints
): Promise<LlmGenerateResult> {
  const systemPrompt = buildSystemPrompt(skillSystemPrompt);
  const userPrompt = buildUserPrompt(description, fieldHints);
  const rawResponse = await callLlm(config, systemPrompt, userPrompt);

  return {
    sparkFields: parseLlmResponse(rawResponse),
    rawResponse,
    modelUsed: config.model
  };
}
