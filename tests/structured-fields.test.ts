import { describe, expect, test } from "vitest";
import { parseWorkflowTable, serializeWorkflowTable, workflowFieldFormats } from "@/lib/structured-fields";

describe("structured workflow field formats", () => {
  test("serializes shot lists as fixed markdown tables", () => {
    const format = workflowFieldFormats.shotList;
    expect(format?.kind).toBe("table");

    const markdown = serializeWorkflowTable([["主视觉全身", "居中构图", "站姿，冷静", "自然侧逆光", "避开游客"]], format!.columns);

    expect(markdown).toContain("| 镜头 | 景别/构图 | 模特动作 | 打光 | 备注 |");
    expect(markdown).toContain("| 主视觉全身 | 居中构图 | 站姿，冷静 | 自然侧逆光 | 避开游客 |");
  });

  test("parses existing numbered shot list text into editable table rows", () => {
    const format = workflowFieldFormats.shotList!;
    const rows = parseWorkflowTable(
      "1. 主视觉全身站姿：人物位于植物通道中央；镜头建议 35mm，f2.2。\n2. 半身回望：模特侧身回头，背景虚化。",
      format.columns,
      format.minRows,
      "shotList"
    );

    expect(rows[0][0]).toBe("主视觉全身站姿");
    expect(rows[0][1]).toContain("人物位于植物通道中央");
    expect(rows[1][0]).toBe("半身回望");
  });

  test("does not define table formats for non-shot fields", () => {
    expect(workflowFieldFormats.deliverables).toBeUndefined();
    expect(workflowFieldFormats.location).toBeUndefined();
    expect(workflowFieldFormats.retouching).toBeUndefined();
  });
});
