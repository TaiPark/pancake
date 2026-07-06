import { describe, expect, test } from "vitest";
import { SessionStage } from "@prisma/client";
import {
  canMoveSessionStage,
  defaultSparkFields,
  mergeSparkFields,
  parseSparkFields,
  stageHint,
  stageLabel,
  workflowSections
} from "@/lib/domain";

describe("session workflow domain rules", () => {
  test("allows staying in the same stage", () => {
    expect(canMoveSessionStage(SessionStage.SPARK, SessionStage.SPARK)).toBe(true);
  });

  test("allows moving only to adjacent stages", () => {
    expect(canMoveSessionStage(SessionStage.SPARK, SessionStage.PLAN)).toBe(true);
    expect(canMoveSessionStage(SessionStage.PLAN, SessionStage.FEEDBACK)).toBe(true);
    expect(canMoveSessionStage(SessionStage.FEEDBACK, SessionStage.SPARK)).toBe(false);
  });

  test("normalizes malformed workflow fields while preserving known text", () => {
    const parsed = parseSparkFields({ theme: "雨夜", mood: 42, references: "胶片", notes: null, callSheet: "19:30 集合" });

    expect(parsed).toMatchObject({
      theme: "雨夜",
      mood: "",
      references: "胶片",
      notes: "",
      callSheet: "19:30 集合"
    });
    expect(Object.keys(parsed)).toEqual(Object.keys(defaultSparkFields));
  });

  test("labels stages as the shoot lifecycle", () => {
    expect(stageLabel(SessionStage.SPARK)).toBe("拍摄前");
    expect(stageLabel(SessionStage.PLAN)).toBe("拍摄中");
    expect(stageLabel(SessionStage.FEEDBACK)).toBe("拍摄后");
    expect(stageHint(SessionStage.PLAN)).toContain("现场");
  });

  test("defines daily workflow sections for before during and after a shoot", () => {
    expect(workflowSections.map((section) => section.stage)).toEqual([
      SessionStage.SPARK,
      SessionStage.PLAN,
      SessionStage.FEEDBACK
    ]);
    expect(workflowSections.flatMap((section) => section.fields.map((field) => field.name))).toEqual(
      Object.keys(defaultSparkFields)
    );
  });

  test("only keeps the shot list as a structured table format", () => {
    const fields = Object.fromEntries(workflowSections.flatMap((section) => section.fields.map((field) => [field.name, field])));

    expect(fields.shotList.format).toBe("table");
    expect(fields.deliverables.format).toBeUndefined();
    expect(fields.callSheet.format).toBeUndefined();
    expect(fields.team.format).toBeUndefined();
    expect(fields.gear.format).toBeUndefined();
    expect(fields.onsiteChecklist.format).toBeUndefined();
    expect(fields.retouching.format).toBeUndefined();
  });

  test("merges partial workflow form updates without clearing hidden stages", () => {
    const formData = new FormData();
    formData.set("theme", "新主题");
    formData.set("mood", "");

    expect(
      mergeSparkFields(
        {
          ...defaultSparkFields,
          theme: "旧主题",
          mood: "旧情绪",
          onsiteChecklist: "现场检查保留",
          retrospective: "复盘保留"
        },
        formData
      )
    ).toMatchObject({
      theme: "新主题",
      mood: "",
      onsiteChecklist: "现场检查保留",
      retrospective: "复盘保留"
    });
  });
});
