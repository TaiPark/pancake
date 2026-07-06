"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SessionStage } from "@prisma/client";
import { regenerateSparkFieldsAction } from "@/app/actions";
import { PendingButton } from "@/components/PendingButton";
import { StructuredWorkflowField } from "@/components/StructuredWorkflowField";
import type { SparkFields, WorkflowSection } from "@/lib/domain";

const stageLabels: Record<SessionStage, string> = {
  SPARK: "拍摄前",
  PLAN: "拍摄中",
  FEEDBACK: "拍摄后"
};

type WorkflowEditorProps = {
  sessionId: string;
  currentStage: SessionStage;
  sections: WorkflowSection[];
  spark: SparkFields;
  updateAction: (formData: FormData) => void | Promise<void>;
  aiGenerated: boolean;
  aiRawResponse: string;
  hasLlmConfig: boolean;
  description: string;
};

export function WorkflowEditor({
  sessionId,
  currentStage,
  sections,
  spark,
  updateAction,
  aiGenerated,
  aiRawResponse,
  hasLlmConfig,
  description
}: WorkflowEditorProps) {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState<SessionStage>(currentStage);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [regenerateError, setRegenerateError] = useState("");
  const [regenerating, startRegenerate] = useTransition();
  const selectedSection = sections.find((section) => section.stage === selectedStage) ?? sections[0];
  const canRegenerate = selectedSection.stage === "SPARK" && hasLlmConfig && description.trim().length > 0;

  function regenerate() {
    setRegenerateError("");
    startRegenerate(async () => {
      const result = await regenerateSparkFieldsAction(sessionId);
      if (result.error) {
        setRegenerateError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid content-start gap-4">
      <section className="workflow-rail grid items-stretch gap-3 md:grid-cols-3">
        {sections.map((section, index) => {
          const filled = section.fields.filter((field) => spark[field.name].trim().length > 0).length;
          const selected = section.stage === selectedSection.stage;

          return (
            <button
              className={`workflow-card panel reveal flex min-h-48 w-full cursor-pointer flex-col p-4 text-left text-[var(--text)] ${selected ? "workflow-card-active" : ""}`}
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
              <div className="mt-5 min-h-7">
                {section.stage === "SPARK" && aiGenerated ? (
                  <span className="inline-flex w-fit rounded-full border border-[var(--accent)]/30 px-2 py-1 text-xs text-[var(--accent-strong)]">
                    AI 生成
                  </span>
                ) : null}
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
          {selectedSection.stage === "SPARK" ? (
            <div className="studio-card grid gap-3 p-3">
              <div className="flex flex-wrap items-center gap-3">
                {aiGenerated ? (
                  <span className="rounded-full border border-[var(--accent)]/30 px-2 py-1 text-xs text-[var(--accent-strong)]">AI 已生成</span>
                ) : (
                  <span className="text-sm text-[var(--muted)]">当前拍摄前内容尚未标记为 AI 生成。</span>
                )}
                {canRegenerate ? (
                  <PendingButton
                    className="button button-secondary min-h-9 px-3 text-xs"
                    disabled={regenerating}
                    onClick={regenerate}
                    pending={regenerating}
                    pendingText="正在重新生成..."
                    type="button"
                  >
                    重新生成
                  </PendingButton>
                ) : null}
                {aiRawResponse ? (
                  <button
                    className="button button-secondary min-h-9 px-3 text-xs"
                    onClick={() => setShowRawResponse((value) => !value)}
                    type="button"
                  >
                    {showRawResponse ? "隐藏原始输出" : "查看原始输出"}
                  </button>
                ) : null}
              </div>
              {regenerateError ? <p className="text-sm text-red-100">{regenerateError}</p> : null}
              {showRawResponse && aiRawResponse ? (
                <pre className="max-h-72 overflow-auto rounded-[8px] border border-white/10 bg-black/30 p-3 text-xs leading-5 text-[var(--muted)]">
                  {aiRawResponse}
                </pre>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            {selectedSection.fields.map((field) => (
              <StructuredWorkflowField field={field} key={field.name} value={spark[field.name]} />
            ))}
          </div>
        </section>
        <PendingButton className="button button-primary justify-self-start" pendingText={`正在保存${selectedSection.title}...`}>
          保存{selectedSection.title}流程
        </PendingButton>
      </form>
    </div>
  );
}
