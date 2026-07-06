"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import type { WorkflowField } from "@/lib/domain";
import { getWorkflowFieldFormat, parseWorkflowTable, serializeWorkflowTable } from "@/lib/structured-fields";

type StructuredWorkflowFieldProps = {
  field: WorkflowField;
  value: string;
};

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
        {field.multiline ? (
          <textarea className="field min-h-28" name={field.name} defaultValue={value} placeholder={field.placeholder} />
        ) : (
          <input className="field" name={field.name} defaultValue={value} placeholder={field.placeholder} />
        )}
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
      <div className="structured-table-wrap">
        <table className="structured-table">
          <thead>
            <tr>
              {tableFormat.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {tableFormat.columns.map((column, columnIndex) => (
                  <td key={column.key}>
                    <textarea
                      aria-label={`${field.label}-${column.label}-${rowIndex + 1}`}
                      className="structured-cell"
                      onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                      placeholder={column.placeholder}
                      value={row[columnIndex] ?? ""}
                    />
                  </td>
                ))}
                <td>
                  <button
                    aria-label={`删除${field.label}第 ${rowIndex + 1} 行`}
                    className="button button-danger min-h-9 px-2"
                    onClick={() => removeRow(rowIndex)}
                    type="button"
                  >
                    <Trash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
