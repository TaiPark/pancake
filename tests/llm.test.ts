import { afterEach, describe, expect, test, vi } from "vitest";
import { defaultSparkFields } from "@/lib/domain";
import { buildSystemPrompt, buildUserPrompt, callLlm, parseLlmResponse } from "@/lib/llm";

describe("llm helpers", () => {
  const originalTimeout = process.env.LLM_TIMEOUT_MS;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalTimeout === undefined) {
      delete process.env.LLM_TIMEOUT_MS;
    } else {
      process.env.LLM_TIMEOUT_MS = originalTimeout;
    }
  });

  test("builds a user prompt with the shoot description and field hints", () => {
    const prompt = buildUserPrompt("我想拍一组秋天公园的人像", {
      shotList: "生成 6 个带人物姿态的分镜",
      onsiteChecklist: "不应该生成拍摄中内容"
    });

    expect(prompt).toContain("秋天公园的人像");
    expect(prompt).toContain('"theme"');
    expect(prompt).toContain('"shotList": "生成 6 个带人物姿态的分镜');
    expect(prompt).toContain("| 镜头 | 景别/构图 | 模特动作 | 打光 | 备注 |");
    expect(prompt).toContain("表头固定");
    expect(prompt).toContain("至少 10 条");
    expect(prompt).toContain("除备注外每一列都必须填满");
    expect(prompt).toContain("必须输出合法的 JSON");
    expect(prompt).not.toContain("onsiteChecklist");
    expect(prompt).not.toContain("retrospective");
  });

  test("builds a system prompt with optional skill guidance", () => {
    expect(buildSystemPrompt()).toContain("PancakeHub 摄影规划助手");
    expect(buildSystemPrompt()).toContain("拍摄主题、分镜、灯光、服化造、现场执行和交付复盘");
    expect(buildSystemPrompt("重点关注人像情绪")).toContain("重点关注人像情绪");
  });

  test("parses valid LLM JSON into Spark fields and defaults missing fields", () => {
    const result = parseLlmResponse(
      JSON.stringify({
        theme: "秋日暖阳人像",
        mood: "温暖、宁静、怀旧"
      })
    );

    expect(result).toMatchObject({
      ...defaultSparkFields,
      theme: "秋日暖阳人像",
      mood: "温暖、宁静、怀旧"
    });
  });

  test("falls back to empty Spark fields when LLM JSON is invalid", () => {
    expect(parseLlmResponse("不是 JSON")).toEqual(defaultSparkFields);
  });

  test("throws a useful error when the LLM API returns a failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", {
        status: 401
      })
    );

    await expect(
      callLlm(
        {
          apiKey: "bad-key",
          baseUrl: "https://api.example.com/v1",
          model: "example-model",
          temperature: 0.1,
          maxTokens: 50
        },
        "system",
        "user"
      )
    ).rejects.toThrow("LLM API 调用失败: 401 Unauthorized");
  });

  test("adds a lowercase json keyword for strict compatible providers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        choices: [{ message: { content: "{\"message\":\"ok\"}" } }]
      })
    );

    await callLlm(
      {
        apiKey: "key",
        baseUrl: "https://api.example.com/v1",
        model: "example-model",
        temperature: 0.1,
        maxTokens: 50
      },
      "你是一个测试助手。",
      "请回复 JSON：{\"message\":\"连接成功\"}。"
    );

    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { messages: Array<{ content: string }> };
    expect(body.messages.some((message) => message.content.includes("json"))).toBe(true);
  });

  test("summarizes Cloudflare 524 HTML errors without leaking the whole page", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<!DOCTYPE html><title>ikuncode.cc | 524: A timeout occurred</title><h1>A timeout occurred</h1>", {
        status: 524,
        headers: { "Content-Type": "text/html" }
      })
    );

    await expect(
      callLlm(
        {
          apiKey: "key",
          baseUrl: "https://api.example.com/v1",
          model: "example-model",
          temperature: 0.7,
          maxTokens: 4096
        },
        "system",
        "user"
      )
    ).rejects.toThrow("LLM 上游服务响应超时（524）");

    await expect(
      callLlm(
        {
          apiKey: "key",
          baseUrl: "https://api.example.com/v1",
          model: "example-model",
          temperature: 0.7,
          maxTokens: 4096
        },
        "system",
        "user"
      )
    ).rejects.not.toThrow("<!DOCTYPE html>");
  });

  test("explains upstream LLM usage-limit responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          error: {
            status_code: 429,
            message: "The usage limit has been reached"
          }
        },
        { status: 429 }
      )
    );

    await expect(
      callLlm(
        {
          apiKey: "key",
          baseUrl: "https://api.example.com/v1",
          model: "example-model",
          temperature: 0.7,
          maxTokens: 4096
        },
        "system",
        "user"
      )
    ).rejects.toThrow("LLM 服务额度或限流已触发（429）");
  });

  test("uses a longer default timeout for full session generation", async () => {
    delete process.env.LLM_TIMEOUT_MS;
    const signal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        choices: [{ message: { content: "{\"theme\":\"雨夜\"}" } }]
      })
    );

    await callLlm(
      {
        apiKey: "key",
        baseUrl: "https://api.example.com/v1",
        model: "example-model",
        temperature: 0.7,
        maxTokens: 4096
      },
      "system",
      "user"
    );

    expect(timeoutSpy).toHaveBeenCalledWith(180000);
  });

  test("wraps aborted LLM requests with a clear timeout message", async () => {
    process.env.LLM_TIMEOUT_MS = "90000";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new DOMException("The operation was aborted due to timeout", "TimeoutError")
    );

    await expect(
      callLlm(
        {
          apiKey: "key",
          baseUrl: "https://api.example.com/v1",
          model: "example-model",
          temperature: 0.7,
          maxTokens: 4096
        },
        "system",
        "user"
      )
    ).rejects.toThrow("LLM API 调用超时（90 秒）");
  });
});
