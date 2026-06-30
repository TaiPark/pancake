import { describe, expect, test } from "vitest";
import { SessionStage } from "@prisma/client";
import { canMoveSessionStage, parseSparkFields, stageLabel } from "@/lib/domain";

describe("session workflow domain rules", () => {
  test("allows staying in the same stage", () => {
    expect(canMoveSessionStage(SessionStage.SPARK, SessionStage.SPARK)).toBe(true);
  });

  test("allows moving only to adjacent stages", () => {
    expect(canMoveSessionStage(SessionStage.SPARK, SessionStage.PLAN)).toBe(true);
    expect(canMoveSessionStage(SessionStage.PLAN, SessionStage.FEEDBACK)).toBe(true);
    expect(canMoveSessionStage(SessionStage.FEEDBACK, SessionStage.SPARK)).toBe(false);
  });

  test("normalizes malformed spark fields", () => {
    expect(parseSparkFields({ theme: "雨夜", mood: 42, references: "胶片", notes: null })).toEqual({
      theme: "雨夜",
      mood: "",
      references: "胶片",
      notes: ""
    });
  });

  test("labels stages in Chinese", () => {
    expect(stageLabel(SessionStage.SPARK)).toBe("思维火花");
    expect(stageLabel(SessionStage.PLAN)).toBe("规划");
    expect(stageLabel(SessionStage.FEEDBACK)).toBe("反馈");
  });
});
