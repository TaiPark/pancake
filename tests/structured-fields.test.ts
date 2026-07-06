import { describe, expect, test } from "vitest";
import { parseWorkflowTable, serializeWorkflowTable, workflowFieldFormats } from "@/lib/structured-fields";

describe("structured workflow field formats", () => {
  test("serializes shot lists as fixed markdown tables", () => {
    const format = workflowFieldFormats.shotList;
    expect(format?.kind).toBe("table");

    const markdown = serializeWorkflowTable(
      [["主视觉全身", "居中构图", "站姿，冷静", "35mm f2.2", "避开游客"]],
      format!.columns
    );

    expect(markdown).toContain("| 镜头 | 景别/构图 | 动作/情绪 | 镜头参数 | 备注 |");
    expect(markdown).toContain("| 主视觉全身 | 居中构图 | 站姿，冷静 | 35mm f2.2 | 避开游客 |");
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

  test("extracts deliverable rows from prose instead of padding empty rows", () => {
    const format = workflowFieldFormats.deliverables!;
    const rows = parseWorkflowTable(
      "建议交付：精修成片 12-18 张，其中竖版人像 8-10 张，横版环境人像 4-6 张；棚拍环节人像 4-6 张用于备选。",
      format.columns,
      format.minRows,
      "deliverables"
    );

    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual(["精修成片", "", "12-18 张", ""]);
    expect(rows[1]).toEqual(["竖版人像", "", "8-10 张", ""]);
    expect(rows[2]).toEqual(["横版环境人像", "", "4-6 张", ""]);
    expect(rows.every((row) => row.some((cell) => cell.trim()))).toBe(true);
  });

  test("keeps unstructured prose as one readable row", () => {
    const format = workflowFieldFormats.location!;
    const rows = parseWorkflowTable("上海植物园温室优先选择具有层次感绿植、通透散射光和避雨空间的区域。", format.columns, format.minRows, "location");

    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toContain("上海植物园温室");
  });
});
