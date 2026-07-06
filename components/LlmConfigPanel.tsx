"use client";

import { useRef, useState, useTransition } from "react";
import { deleteLlmConfigAction, saveLlmConfigAction, testLlmConfigAction } from "@/app/actions";
import { PendingButton } from "@/components/PendingButton";

type LlmConfigPanelProps = {
  groupId: string;
  existingConfig:
    | {
        apiKey: string;
        baseUrl: string;
        model: string;
        temperature: number;
        maxTokens: number;
      }
    | null;
  isOwner: boolean;
};

type Result = { ok?: boolean; error?: string; message?: string } | null;
type PendingAction = "save" | "test" | "delete" | null;

export function LlmConfigPanel({ groupId, existingConfig, isOwner }: LlmConfigPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showKey, setShowKey] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [pending, startTransition] = useTransition();

  if (!isOwner) {
    return (
      <section className="panel p-5">
        <h2 className="text-2xl font-semibold tracking-tight">AI 配置</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          {existingConfig ? "群组已配置 LLM，创建 Session 时可以使用 AI 生成。" : "群组尚未配置 LLM，请联系 OWNER 配置。"}
        </p>
      </section>
    );
  }

  function submitConfig(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPendingAction("save");
    startTransition(async () => {
      setResult(await saveLlmConfigAction(groupId, null, formData));
      setPendingAction(null);
    });
  }

  function testConfig() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    setPendingAction("test");
    startTransition(async () => {
      setResult(await testLlmConfigAction(groupId, null, formData));
      setPendingAction(null);
    });
  }

  function deleteConfig() {
    setPendingAction("delete");
    startTransition(async () => {
      setResult(await deleteLlmConfigAction(groupId));
      setPendingAction(null);
    });
  }

  return (
    <section className="panel p-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">AI 配置</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">配置 OpenAI-compatible API Key、Base URL 和模型名称。</p>
      </div>

      {result?.error ? (
        <p className="mt-4 rounded-[8px] border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">{result.error}</p>
      ) : null}
      {result?.ok ? (
        <p className="mt-4 rounded-[8px] border border-emerald-300/30 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-100">
          {result.message ?? "操作成功"}
        </p>
      ) : null}

      <form className="mt-5 grid gap-4" onSubmit={submitConfig} ref={formRef}>
        <label className="grid gap-2 text-sm">
          API Key
          <div className="relative">
            <input
              className="field pr-16"
              defaultValue={existingConfig?.apiKey ?? ""}
              name="apiKey"
              placeholder="sk-..."
              required
              type={showKey ? "text" : "password"}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-[var(--muted)]"
              onClick={() => setShowKey((value) => !value)}
              type="button"
            >
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
        </label>

        <label className="grid gap-2 text-sm">
          API Base URL
          <input className="field" defaultValue={existingConfig?.baseUrl ?? "https://api.openai.com/v1"} name="baseUrl" required type="url" />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm md:col-span-1">
            模型
            <input className="field" defaultValue={existingConfig?.model ?? "gpt-4o"} name="model" required />
          </label>
          <label className="grid gap-2 text-sm">
            Temperature
            <input className="field" defaultValue={existingConfig?.temperature ?? 0.7} max={2} min={0} name="temperature" step={0.1} type="number" />
          </label>
          <label className="grid gap-2 text-sm">
            Max Tokens
            <input className="field" defaultValue={existingConfig?.maxTokens ?? 4096} max={128000} min={1} name="maxTokens" type="number" />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <PendingButton className="button button-primary" disabled={pending} pending={pending && pendingAction === "save"} pendingText="保存中...">
            保存配置
          </PendingButton>
          <PendingButton
            className="button button-secondary"
            disabled={pending}
            onClick={testConfig}
            pending={pending && pendingAction === "test"}
            pendingText="正在测试..."
            type="button"
          >
            测试连接
          </PendingButton>
          {existingConfig ? (
            <PendingButton
              className="button button-danger"
              disabled={pending}
              onClick={deleteConfig}
              pending={pending && pendingAction === "delete"}
              pendingText="删除中..."
              type="button"
            >
              删除配置
            </PendingButton>
          ) : null}
        </div>
      </form>
    </section>
  );
}
