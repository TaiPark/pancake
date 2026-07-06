import type { SparkFields } from "@/lib/domain";
import { parseSparkFields } from "@/lib/domain";
import { getWorkflowFieldAiInstruction } from "@/lib/structured-fields";

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

const defaultLlmTimeoutMs = 180000;

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
  shotList: "生成至少 10 条分镜供参考，重点描述景别、构图、模特动作和打光",
  lightingPlan: "设计适合的灯光方案（自然光/人工光/混合）",
  notes: "列出可能需要注意的问题和未定事项"
};

export function getLlmTimeoutMs(): number {
  const rawValue = process.env.LLM_TIMEOUT_MS;
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 1000) {
    return parsed;
  }

  return defaultLlmTimeoutMs;
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "TimeoutError" || error.name === "AbortError" || error.message.toLowerCase().includes("timeout");
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function describeLlmHttpError(status: number, rawText: string, contentType: string): string {
  const normalizedText = rawText.toLowerCase();
  if (status === 429 || normalizedText.includes("usage limit") || normalizedText.includes("rate limit")) {
    return "LLM 服务额度或限流已触发（429）：当前 API Key、账号或上游模型服务已达到用量限制。请更换/充值额度，或稍后重试；也可以临时降低 Max Tokens 后再生成。";
  }

  if (status === 524) {
    return "LLM 上游服务响应超时（524）：API 网关已连接到上游，但上游没有在 Cloudflare 超时时间内完成响应。请稍后重试；如果连续出现，请检查 API Base URL/模型服务状态，或降低 Max Tokens 后再试。";
  }

  const isHtml = contentType.includes("text/html") || /^\s*<!doctype html/i.test(rawText) || /^\s*<html/i.test(rawText);
  const detail = isHtml ? stripHtml(rawText) : rawText.trim();
  const clippedDetail = detail.length > 500 ? `${detail.slice(0, 500)}...` : detail;

  return `LLM API 调用失败: ${status}${clippedDetail ? ` ${clippedDetail}` : ""}`;
}

export function buildUserPrompt(description: string, fieldHints: FieldHints): string {
  const merged = Object.fromEntries(
    Object.entries(defaultHints).map(([field, hint]) => [field, fieldHints[field] ?? hint])
  );
  const fieldInstructions = Object.entries(merged)
    .map(([field, hint]) => {
      const formatInstruction = getWorkflowFieldAiInstruction(field as keyof SparkFields);
      return `  "${field}": "${hint}${formatInstruction ? `。格式：${formatInstruction}` : ""}"`;
    })
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
4. 分镜清单（shotList）至少给出 10 条分镜供参考，必须使用指定 Markdown 表格表头；除备注列外，每一列都必须填满
5. 其它字段保持自然文本，不要强行输出表格
6. 所有内容使用中文
`.trim();
}

export function buildSystemPrompt(skillSystemPrompt?: string): string {
  const base = `你是 PancakeHub 摄影规划助手。你的任务是根据用户的拍摄意图描述，生成一份完整的拍摄前规划文档。

默认专业 Skill：
- 围绕拍摄主题、分镜、灯光、服化造、现场执行和交付复盘给出可落地建议
- 优先输出团队当天可以直接照着执行的内容，避免空泛形容
- 如果没有自定义 Skill，使用这套默认摄影协作模板

输出要求：
- 必须输出合法的 JSON 对象，包含所有指定的字段
- 每个字段的值是字符串类型；表格字段的字符串内容使用 Markdown 表格
- 内容要具体、专业、可操作
- 使用中文输出`;

  if (!skillSystemPrompt) {
    return base;
  }

  return `${base}\n\n## 额外专业指引\n${skillSystemPrompt}`;
}

export async function callLlm(config: LlmCallConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const timeoutMs = getLlmTimeoutMs();
  let response: Response;

  try {
    response = await fetch(url, {
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
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(`LLM API 调用超时（${Math.round(timeoutMs / 1000)} 秒），请降低 Max Tokens 或调大 LLM_TIMEOUT_MS。`);
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(describeLlmHttpError(response.status, errorText, response.headers.get("content-type") ?? ""));
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
