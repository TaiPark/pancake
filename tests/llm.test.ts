import { afterEach, describe, expect, test, vi } from "vitest";
import { defaultSparkFields } from "@/lib/domain";
import { buildSystemPrompt, buildUserPrompt, callLlm, parseLlmResponse } from "@/lib/llm";

describe("llm helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("builds a user prompt with the shoot description and field hints", () => {
    const prompt = buildUserPrompt("我想拍一组秋天公园的人像", {
      shotList: "生成 6 个带人物姿态的分镜",
      onsiteChecklist: "不应该生成拍摄中内容"
    });

    expect(prompt).toContain("秋天公园的人像");
    expect(prompt).toContain('"theme"');
    expect(prompt).toContain('"shotList": "生成 6 个带人物姿态的分镜"');
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
});
