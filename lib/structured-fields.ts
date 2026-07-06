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
  { key: "action", label: "模特动作", placeholder: "站姿，冷静望向镜头" },
  { key: "lighting", label: "打光", placeholder: "自然侧逆光，反光板补眼神光" },
  { key: "notes", label: "备注", placeholder: "避开游客，保留绿色背景" }
];

const formats = {
  shotList: {
    kind: "table",
    minRows: 10,
    columns: shotColumns,
    aiInstruction:
      "必须输出 Markdown 表格，表头固定为 | 镜头 | 景别/构图 | 模特动作 | 打光 | 备注 |；至少 10 条；除备注外每一列都必须填满；重点描述景别、构图、模特动作和打光；不要输出编号段落"
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
