import type { SparkFields } from "@/lib/domain";

export type WorkflowTableColumn = {
  key: string;
  label: string;
  placeholder?: string;
};

export type WorkflowFieldFormat = {
  kind: "table";
  columns: WorkflowTableColumn[];
  minRows: number;
  aiInstruction: string;
};

const shotColumns: WorkflowTableColumn[] = [
  { key: "shot", label: "镜头", placeholder: "主视觉全身" },
  { key: "frame", label: "景别/构图", placeholder: "居中构图，前景留植物" },
  { key: "action", label: "动作/情绪", placeholder: "站姿，冷静望向镜头" },
  { key: "settings", label: "镜头参数", placeholder: "35mm f2.2 1/500s ISO 200" },
  { key: "notes", label: "备注", placeholder: "避开游客，保留绿色背景" }
];

const formats = {
  deliverables: {
    kind: "table",
    minRows: 3,
    columns: [
      { key: "type", label: "交付类型", placeholder: "精修图" },
      { key: "spec", label: "规格", placeholder: "竖版 4:5 / sRGB" },
      { key: "count", label: "数量", placeholder: "9 张" },
      { key: "usage", label: "用途", placeholder: "小红书发布" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 交付类型 | 规格 | 数量 | 用途 |"
  },
  location: {
    kind: "table",
    minRows: 2,
    columns: [
      { key: "place", label: "地点", placeholder: "上海植物园温室" },
      { key: "usage", label: "用途", placeholder: "主场景" },
      { key: "permission", label: "许可/费用", placeholder: "确认拍摄规定" },
      { key: "risk", label: "风险/备选", placeholder: "雨天转室内" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 地点 | 用途 | 许可/费用 | 风险/备选 |"
  },
  callSheet: {
    kind: "table",
    minRows: 5,
    columns: [
      { key: "time", label: "时间", placeholder: "09:30" },
      { key: "item", label: "事项", placeholder: "集合/妆造/开拍" },
      { key: "owner", label: "负责人", placeholder: "摄影/模特/妆造" },
      { key: "notes", label: "备注", placeholder: "迟到缓冲 15 分钟" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 时间 | 事项 | 负责人 | 备注 |"
  },
  team: {
    kind: "table",
    minRows: 4,
    columns: [
      { key: "role", label: "角色", placeholder: "摄影" },
      { key: "name", label: "成员", placeholder: "阿泰" },
      { key: "work", label: "职责", placeholder: "构图、灯光、导出备份" },
      { key: "contact", label: "联系方式", placeholder: "微信/电话" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 角色 | 成员 | 职责 | 联系方式 |"
  },
  gear: {
    kind: "table",
    minRows: 5,
    columns: [
      { key: "category", label: "类别", placeholder: "相机/灯光/道具" },
      { key: "item", label: "物品", placeholder: "85mm 镜头" },
      { key: "count", label: "数量", placeholder: "1" },
      { key: "owner", label: "负责人", placeholder: "摄影" },
      { key: "status", label: "状态", placeholder: "已备/待借" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 类别 | 物品 | 数量 | 负责人 | 状态 |"
  },
  styling: {
    kind: "table",
    minRows: 4,
    columns: [
      { key: "part", label: "项目", placeholder: "服装/妆面/发型" },
      { key: "direction", label: "方向", placeholder: "白色医疗感，干净材质" },
      { key: "avoid", label: "避免", placeholder: "高反光面料" },
      { key: "owner", label: "负责人", placeholder: "模特/妆造" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 项目 | 方向 | 避免 | 负责人 |"
  },
  references: {
    kind: "table",
    minRows: 4,
    columns: [
      { key: "direction", label: "参考方向", placeholder: "日系植物人像" },
      { key: "source", label: "来源/链接", placeholder: "摄影师/电影/图片链接" },
      { key: "usage", label: "借鉴点", placeholder: "色调、构图、姿态" },
      { key: "notes", label: "备注", placeholder: "避免过暗" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 参考方向 | 来源/链接 | 借鉴点 | 备注 |"
  },
  shotList: {
    kind: "table",
    minRows: 6,
    columns: shotColumns,
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 镜头 | 景别/构图 | 动作/情绪 | 镜头参数 | 备注 |；不要输出编号段落"
  },
  lightingPlan: {
    kind: "table",
    minRows: 4,
    columns: [
      { key: "source", label: "光源", placeholder: "自然侧逆光" },
      { key: "position", label: "位置/方向", placeholder: "人物左后方" },
      { key: "settings", label: "参数/工具", placeholder: "反光板补眼神光" },
      { key: "effect", label: "目标效果", placeholder: "肤色干净，绿色不脏" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 光源 | 位置/方向 | 参数/工具 | 目标效果 |"
  },
  notes: {
    kind: "table",
    minRows: 4,
    columns: [
      { key: "question", label: "未定项", placeholder: "是否允许补光灯" },
      { key: "impact", label: "影响", placeholder: "影响现场光比" },
      { key: "next", label: "下一步", placeholder: "提前电话确认" },
      { key: "owner", label: "负责人", placeholder: "摄影" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 未定项 | 影响 | 下一步 | 负责人 |"
  },
  onsiteChecklist: {
    kind: "table",
    minRows: 6,
    columns: [
      { key: "item", label: "检查项", placeholder: "光线/机位/妆造" },
      { key: "standard", label: "确认标准", placeholder: "肤色不过曝" },
      { key: "owner", label: "负责人", placeholder: "摄影" },
      { key: "status", label: "状态/备注", placeholder: "现场勾选" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 检查项 | 确认标准 | 负责人 | 状态/备注 |"
  },
  liveNotes: {
    kind: "table",
    minRows: 4,
    columns: [
      { key: "time", label: "时间点", placeholder: "10:40" },
      { key: "change", label: "现场变化", placeholder: "主场景游客过多" },
      { key: "action", label: "处理方式", placeholder: "转到温室侧门" },
      { key: "followup", label: "后续提醒", placeholder: "补拍半身" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 时间点 | 现场变化 | 处理方式 | 后续提醒 |"
  },
  backupPlan: {
    kind: "table",
    minRows: 4,
    columns: [
      { key: "asset", label: "素材", placeholder: "RAW 卡 1" },
      { key: "location", label: "备份位置", placeholder: "移动硬盘 A" },
      { key: "owner", label: "负责人", placeholder: "摄影" },
      { key: "status", label: "状态", placeholder: "已校验/待上传" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 素材 | 备份位置 | 负责人 | 状态 |"
  },
  selects: {
    kind: "table",
    minRows: 5,
    columns: [
      { key: "file", label: "文件/组别", placeholder: "DSC_1024" },
      { key: "choice", label: "选择", placeholder: "入选/待定/淘汰" },
      { key: "reason", label: "原因", placeholder: "表情自然" },
      { key: "next", label: "下一步", placeholder: "精修/二选一" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 文件/组别 | 选择 | 原因 | 下一步 |"
  },
  retouching: {
    kind: "table",
    minRows: 5,
    columns: [
      { key: "area", label: "修图项", placeholder: "肤色/背景/裁切" },
      { key: "requirement", label: "要求", placeholder: "保留自然纹理" },
      { key: "avoid", label: "禁修点", placeholder: "不要磨皮过度" },
      { key: "deliverable", label: "交付规格", placeholder: "4:5 JPG" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 修图项 | 要求 | 禁修点 | 交付规格 |"
  },
  publishing: {
    kind: "table",
    minRows: 4,
    columns: [
      { key: "platform", label: "平台", placeholder: "小红书/微博" },
      { key: "content", label: "内容", placeholder: "9 图组图" },
      { key: "time", label: "发布时间", placeholder: "周五 20:00" },
      { key: "credit", label: "署名/授权", placeholder: "摄影、模特、妆造" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 平台 | 内容 | 发布时间 | 署名/授权 |"
  },
  retrospective: {
    kind: "table",
    minRows: 4,
    columns: [
      { key: "topic", label: "复盘维度", placeholder: "光线/沟通/时间" },
      { key: "worked", label: "有效做法", placeholder: "提前踩点" },
      { key: "blocked", label: "卡点", placeholder: "游客动线干扰" },
      { key: "next", label: "下次动作", placeholder: "准备备选机位" }
    ],
    aiInstruction: "必须输出 Markdown 表格，表头固定为 | 复盘维度 | 有效做法 | 卡点 | 下次动作 |"
  }
} satisfies Partial<Record<keyof SparkFields, WorkflowFieldFormat>>;

export const workflowFieldFormats: Partial<Record<keyof SparkFields, WorkflowFieldFormat>> = formats;

export function getWorkflowFieldFormat(name: keyof SparkFields): WorkflowFieldFormat | undefined {
  return workflowFieldFormats[name];
}

function emptyRows(count: number, columns: WorkflowTableColumn[]): string[][] {
  return Array.from({ length: count }, () => columns.map(() => ""));
}

function splitMarkdownRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function normalizeCells(cells: string[], columns: WorkflowTableColumn[]): string[] {
  return columns.map((_, index) => cells[index] ?? "");
}

function parseMarkdownTable(value: string, columns: WorkflowTableColumn[]): string[][] {
  const tableLines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));

  if (tableLines.length < 2) {
    return [];
  }

  const bodyLines = tableLines.slice(1).filter((line) => !isSeparatorRow(splitMarkdownRow(line)));
  return bodyLines.map((line) => normalizeCells(splitMarkdownRow(line), columns));
}

function parseNumberedShotRows(value: string, columns: WorkflowTableColumn[]): string[][] {
  const matches = Array.from(value.matchAll(/(?:^|\n)\s*\d+[.)、]\s*([\s\S]*?)(?=\n\s*\d+[.)、]|\s*$)/g));

  return matches
    .map((match) => match[1].trim())
    .filter(Boolean)
    .map((item) => {
      const [title, ...rest] = item.split(/[:：]/);
      const description = rest.join("：").trim();
      return normalizeCells([title.trim(), description || item], columns);
    });
}

function parseQuantityRows(value: string, columns: WorkflowTableColumn[]): string[][] {
  const normalized = value
    .replace(/^建议交付[:：]\s*/, "")
    .replace(/^交付[:：]\s*/, "")
    .replace(/[，,；;]/g, "\n");
  const matches = Array.from(normalized.matchAll(/([^\n，,；;。]*?)(\d+\s*[-–—~至到]?\s*\d*\s*张)/g));

  return matches
    .map((match) => {
      const label = match[1]
        .replace(/其中|包括|包含|用于备选|建议/g, "")
        .replace(/[:：]/g, "")
        .trim();
      const count = match[2].replace(/\s+/g, " ").trim();

      return normalizeCells([label || "交付物", "", count, ""], columns);
    })
    .filter((row) => row[0].trim() && row[2].trim());
}

export function parseWorkflowTable(
  value: string,
  columns: WorkflowTableColumn[],
  minRowsOrFieldName: number | keyof SparkFields = 1,
  fieldName?: keyof SparkFields
): string[][] {
  const effectiveFieldName = typeof minRowsOrFieldName === "string" ? minRowsOrFieldName : fieldName;
  const markdownRows = parseMarkdownTable(value, columns).filter((row) => row.some((cell) => cell.trim()));
  if (markdownRows.length > 0) {
    return markdownRows;
  }

  if (effectiveFieldName === "deliverables" && value.trim()) {
    const quantityRows = parseQuantityRows(value, columns);
    if (quantityRows.length > 0) {
      return quantityRows;
    }
  }

  if (effectiveFieldName === "shotList" && value.trim()) {
    const shotRows = parseNumberedShotRows(value, columns);
    if (shotRows.length > 0) {
      return shotRows;
    }
  }

  if (value.trim()) {
    return [normalizeCells([value.trim()], columns)];
  }

  return emptyRows(1, columns);
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export function serializeWorkflowTable(rows: string[][], columns: WorkflowTableColumn[]): string {
  const filledRows = rows.filter((row) => row.some((cell) => cell.trim()));
  const bodyRows = filledRows.length > 0 ? filledRows : [columns.map(() => "")];
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = bodyRows.map((row) => `| ${columns.map((_, index) => escapeCell(row[index] ?? "")).join(" | ")} |`);

  return [header, divider, ...body].join("\n");
}

export function getWorkflowFieldAiInstruction(name: keyof SparkFields): string | undefined {
  return getWorkflowFieldFormat(name)?.aiInstruction;
}
