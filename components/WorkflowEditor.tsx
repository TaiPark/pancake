"use client";

import { useActionState, useEffect, useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { SessionStage } from "@prisma/client";
import { regenerateSparkFieldsAction } from "@/app/actions";
import { PendingButton } from "@/components/PendingButton";
import { StructuredWorkflowField } from "@/components/StructuredWorkflowField";
import { nextSessionStage, type SparkFields, type WorkflowSection } from "@/lib/domain";
import {
  canAdvanceWorkflow,
  isAiGenerationFailure,
  requiresStageSwitchConfirmation,
  workflowStatusText,
  type WorkflowActionState
} from "@/lib/workflow-editor-state";

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
  saveAction: (
    state: WorkflowActionState,
    formData: FormData
  ) => Promise<NonNullable<WorkflowActionState>>;
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
  saveAction,
  aiGenerated,
  aiRawResponse,
  hasLlmConfig,
  description
}: WorkflowEditorProps) {
  const router = useRouter();
  const [actionState, formAction, pending] = useActionState(saveAction, null);
  const [selectedStage, setSelectedStage] = useState<SessionStage>(currentStage);
  const [dirty, setDirty] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [regenerateError, setRegenerateError] = useState("");
  const [regenerating, startRegenerate] = useTransition();
  const interactionPending = pending || regenerating;
  const selectedSection = sections.find((section) => section.stage === selectedStage) ?? sections[0];
  const nextStage = nextSessionStage(currentStage);
  const canAdvance = canAdvanceWorkflow(selectedStage, currentStage, nextStage);
  const canRegenerate = selectedSection.stage === "SPARK" && hasLlmConfig && description.trim().length > 0;
  const aiFailed = isAiGenerationFailure(aiGenerated, aiRawResponse);
  const statusText = workflowStatusText(dirty, actionState);

  useEffect(() => {
    if (!actionState?.ok) return;

    setDirty(false);
    router.refresh();
  }, [actionState, router]);

  function selectStage(stage: SessionStage) {
    if (stage === selectedStage) return;

    if (
      requiresStageSwitchConfirmation(dirty, selectedStage, stage) &&
      !window.confirm("有未保存修改。切换阶段将丢弃这些修改，确定继续吗？")
    ) {
      return;
    }

    setDirty(false);
    setSelectedStage(stage);
  }

  function trackStructuralEdit(event: MouseEvent<HTMLFormElement>) {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[type="button"]') : null;
    if (button && !button.dataset.workflowUtility) {
      setDirty(true);
    }
  }

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
      <section aria-label="工作流阶段" className="workflow-stage-nav">
        {sections.map((section, index) => {
          const filled = section.fields.filter((field) => spark[field.name].trim().length > 0).length;
          const selected = section.stage === selectedSection.stage;
          const current = section.stage === currentStage;

          return (
            <button
              aria-pressed={selected}
              className={`workflow-stage-button panel reveal flex w-full cursor-pointer flex-col p-4 text-left text-[var(--text)] ${selected ? "workflow-stage-button-active" : ""}`}
              disabled={interactionPending}
              key={section.stage}
              onClick={() => selectStage(section.stage)}
              style={{ animationDelay: `${index * 70}ms` }}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-[var(--accent-strong)]">0{index + 1}</span>
                <div className="flex items-center gap-2">
                  {current ? (
                    <span className="rounded-full border border-[var(--accent)]/30 px-2 py-1 text-xs text-[var(--accent-strong)]">
                      当前阶段
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-[var(--muted)]">
                    {filled}/{section.fields.length}
                  </span>
                </div>
              </div>
              <div className="mt-3 min-h-6">
                {section.stage === "SPARK" && aiGenerated ? (
                  <span className="inline-flex w-fit rounded-full border border-[var(--accent)]/30 px-2 py-1 text-xs text-[var(--accent-strong)]">
                    AI 生成
                  </span>
                ) : null}
              </div>
              <h2 className="mt-auto text-xl font-semibold tracking-tight">{section.title}</h2>
            </button>
          );
        })}
      </section>

      <form
        action={formAction}
        className="grid gap-4"
        onChangeCapture={() => setDirty(true)}
        onClickCapture={trackStructuralEdit}
      >
        <fieldset
          aria-busy={interactionPending}
          className="m-0 grid min-w-0 gap-4 border-0 p-0"
          disabled={interactionPending}
        >
          <legend className="sr-only">{selectedSection.title}工作流编辑</legend>
          <section className="panel reveal grid gap-4 p-5 workflow-section-active" key={selectedSection.stage}>
            <div>
              <p className="font-mono text-xs text-[var(--accent-strong)]">{stageLabels[selectedSection.stage]}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{selectedSection.title}工作流</h2>
              <p className="mt-2 max-w-[68ch] text-sm leading-6 text-[var(--muted)]">{selectedSection.summary}</p>
              {selectedStage !== currentStage ? (
                <p className="mt-3 rounded-[8px] border border-amber-200/20 bg-amber-200/5 px-3 py-2 text-sm text-amber-100">
                  正在查看和编辑其他阶段；这不会改变当前进度。
                </p>
              ) : null}
            </div>
            {selectedSection.stage === "SPARK" ? (
              <div className="studio-card grid gap-3 p-3">
                {aiFailed ? (
                  <div className="rounded-[8px] border border-red-300/25 bg-red-950/30 p-3 text-sm text-red-100" role="alert">
                    <p className="font-semibold">AI 生成失败</p>
                    <p className="mt-1 leading-6">{aiRawResponse.slice("ERROR:".length).trim() || "生成请求失败，请重试。"}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  {aiGenerated ? (
                    <span className="rounded-full border border-[var(--accent)]/30 px-2 py-1 text-xs text-[var(--accent-strong)]">AI 已生成</span>
                  ) : !aiFailed ? (
                    <span className="text-sm text-[var(--muted)]">当前拍摄前内容尚未标记为 AI 生成。</span>
                  ) : null}
                  {canRegenerate ? (
                    <PendingButton
                      className="button button-secondary min-h-9 px-3 text-xs"
                      data-workflow-utility
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
                      data-workflow-utility
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
          <div className="workflow-action-bar">
            <span
              aria-live="polite"
              className={actionState?.error ? "text-sm text-red-100" : "text-sm text-[var(--muted)]"}
            >
              {statusText}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <PendingButton
                className="button button-secondary"
                name="intent"
                pendingText="正在保存..."
                value="save"
              >
                保存当前阶段
              </PendingButton>
              {canAdvance && nextStage ? (
                <PendingButton
                  className="button button-primary"
                  name="intent"
                  pendingText={`正在进入${stageLabels[nextStage]}...`}
                  value="advance"
                >
                  保存并进入{stageLabels[nextStage]}
                </PendingButton>
              ) : null}
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
