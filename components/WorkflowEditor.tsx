"use client";

import { useState } from "react";
import type { SessionStage } from "@prisma/client";
import type { SparkFields, WorkflowSection } from "@/lib/domain";

const stageLabels: Record<SessionStage, string> = {
  SPARK: "拍摄前",
  PLAN: "拍摄中",
  FEEDBACK: "拍摄后"
};

type WorkflowEditorProps = {
  currentStage: SessionStage;
  sections: WorkflowSection[];
  spark: SparkFields;
  updateAction: (formData: FormData) => void | Promise<void>;
};

export function WorkflowEditor({ currentStage, sections, spark, updateAction }: WorkflowEditorProps) {
  const [selectedStage, setSelectedStage] = useState<SessionStage>(currentStage);
  const selectedSection = sections.find((section) => section.stage === selectedStage) ?? sections[0];

  return (
    <div className="grid content-start gap-4">
      <section className="workflow-rail grid items-start gap-3 md:grid-cols-3">
        {sections.map((section, index) => {
          const filled = section.fields.filter((field) => spark[field.name].trim().length > 0).length;
          const selected = section.stage === selectedSection.stage;

          return (
            <button
              className={`workflow-card panel reveal w-full cursor-pointer p-4 text-left text-[var(--text)] ${selected ? "workflow-card-active" : ""}`}
              key={section.stage}
              onClick={() => setSelectedStage(section.stage)}
              style={{ animationDelay: `${index * 70}ms` }}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-[var(--accent-strong)]">0{index + 1}</span>
                <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-[var(--muted)]">
                  {filled}/{section.fields.length}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{section.summary}</p>
            </button>
          );
        })}
      </section>

      <form action={updateAction} className="grid gap-4">
        <section className="panel reveal grid gap-4 p-5 workflow-section-active" key={selectedSection.stage}>
          <div>
            <p className="font-mono text-xs text-[var(--accent-strong)]">{stageLabels[selectedSection.stage]}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{selectedSection.title}工作流</h2>
            <p className="mt-2 max-w-[68ch] text-sm leading-6 text-[var(--muted)]">{selectedSection.summary}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {selectedSection.fields.map((field) => (
              <label className={`grid gap-2 text-sm ${field.multiline ? "md:col-span-2" : ""}`} key={field.name}>
                {field.label}
                {field.multiline ? (
                  <textarea className="field min-h-28" name={field.name} defaultValue={spark[field.name]} placeholder={field.placeholder} />
                ) : (
                  <input className="field" name={field.name} defaultValue={spark[field.name]} placeholder={field.placeholder} />
                )}
              </label>
            ))}
          </div>
        </section>
        <button className="button button-primary justify-self-start" type="submit">
          保存{selectedSection.title}流程
        </button>
      </form>
    </div>
  );
}
