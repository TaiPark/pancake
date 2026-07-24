"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import type { WorkflowField } from "@/lib/domain";
import { getWorkflowFieldFormat, parseWorkflowTable, serializeWorkflowTable } from "@/lib/structured-fields";

type StructuredWorkflowFieldProps = {
  field: WorkflowField;
  value: string;
};

function AutoGrowTextarea({
  name,
  placeholder,
  value
}: {
  name: string;
  placeholder: string;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draftValue, setDraftValue] = useState(value);

  function adjustHeight() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    adjustHeight();
  }, [draftValue]);

  return (
    <textarea
      className="field workflow-textarea"
      name={name}
      onChange={(event) => setDraftValue(event.target.value)}
      onInput={adjustHeight}
      placeholder={placeholder}
      ref={textareaRef}
      rows={1}
      value={draftValue}
    />
  );
}

export function StructuredWorkflowField({ field, value }: StructuredWorkflowFieldProps) {
  const format = getWorkflowFieldFormat(field.name);
  const initialRows = useMemo(
    () => (format ? parseWorkflowTable(value, format.columns, format.minRows, field.name) : []),
    [field.name, format, value]
  );
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  if (!format || field.format !== "table") {
    return (
      <label className={`grid gap-2 text-sm ${field.multiline ? "md:col-span-2" : ""}`}>
        {field.label}
        <AutoGrowTextarea name={field.name} placeholder={field.placeholder} value={value} />
      </label>
    );
  }

  const tableFormat = format;

  function updateCell(rowIndex: number, columnIndex: number, nextValue: string) {
    setRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? tableFormat.columns.map((_, cellIndex) => (cellIndex === columnIndex ? nextValue : row[cellIndex] ?? "")) : row
      )
    );
  }

  function addRow() {
    setRows((current) => [...current, tableFormat.columns.map(() => "")]);
  }

  function removeRow(rowIndex: number) {
    setRows((current) => {
      const nextRows = current.filter((_, index) => index !== rowIndex);
      return nextRows.length > 0 ? nextRows : [tableFormat.columns.map(() => "")];
    });
  }

  const groupLabelId = `${field.name}-structured-label`;
  const gridTemplateColumns = `repeat(${tableFormat.columns.length}, minmax(8.5rem, 1fr))`;

  return (
    <div aria-labelledby={groupLabelId} className="grid gap-3 text-sm md:col-span-2" role="group">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-medium" id={groupLabelId}>
          {field.label}
        </span>
        <button className="button button-secondary min-h-9 px-3 text-xs" onClick={addRow} type="button">
          <Plus size={14} weight="bold" />
          添加一行
        </button>
      </div>
      <input name={field.name} type="hidden" value={serializeWorkflowTable(rows, tableFormat.columns)} readOnly />
      <div className="structured-row-list">
        {rows.map((row, rowIndex) => (
          <article className="structured-row-card" key={rowIndex}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-[var(--accent-strong)]">#{String(rowIndex + 1).padStart(2, "0")}</span>
              <button
                aria-label={`删除${field.label}第 ${rowIndex + 1} 行`}
                className="button button-danger min-h-9 px-2"
                onClick={() => removeRow(rowIndex)}
                type="button"
              >
                <Trash size={14} />
              </button>
            </div>
            <div className="structured-row-grid" style={{ gridTemplateColumns }}>
              {tableFormat.columns.map((column, columnIndex) => (
                <label className="structured-cell-field" key={column.key}>
                  <span>{column.label}</span>
                  <textarea
                    aria-label={`${field.label}-${column.label}-${rowIndex + 1}`}
                    className="structured-cell"
                    onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                    placeholder={column.placeholder}
                    value={row[columnIndex] ?? ""}
                  />
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
