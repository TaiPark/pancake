"use client";

import { GearSix, X } from "@phosphor-icons/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { LlmConfigPanel } from "@/components/LlmConfigPanel";
import { SkillManager } from "@/components/SkillManager";

type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
} | null;

type Skill = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  fieldHints: Record<string, string>;
  isDefault: boolean;
};

type GroupSettingsDialogProps = {
  groupId: string;
  existingConfig: LlmConfig;
  isOwner: boolean;
  skills: Skill[];
};

export function GroupSettingsDialog({ groupId, existingConfig, isOwner, skills }: GroupSettingsDialogProps) {
  const [open, setOpen] = useState(false);

  const dialog =
    open && typeof document !== "undefined" ? (
      <div className="dialog-overlay" onMouseDown={() => setOpen(false)}>
        <div
          className="dialog-content grid gap-4 rounded-[8px] border border-white/12 bg-[#0d0f12]/95 p-4 shadow-2xl md:p-5"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">群组设置</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">管理 AI 配置和生成规划时使用的 Skill。</p>
            </div>
            <button className="button button-secondary min-h-9 px-3 text-sm" onClick={() => setOpen(false)} type="button">
              <X size={16} />
              关闭
            </button>
          </div>

          {!existingConfig ? (
            <p className="rounded-[8px] border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-2 text-sm leading-6 text-[var(--accent-strong)]">
              还没有填写 AI 配置。配置后，创建 Session 时就可以用 AI 生成拍摄前规划。
            </p>
          ) : null}

          <div className="grid gap-4">
            <LlmConfigPanel existingConfig={existingConfig} groupId={groupId} isOwner={isOwner} />
            <SkillManager groupId={groupId} isOwner={isOwner} skills={skills} />
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="grid gap-2">
      <button className="button button-secondary" onClick={() => setOpen(true)} type="button">
        <GearSix size={18} />
        群组设置
      </button>
      {!existingConfig ? (
        <p className="text-sm leading-6 text-[var(--muted)]">未配置 AI。打开群组设置填写 API 后，可用 AI 生成拍摄前规划。</p>
      ) : null}
      {dialog ? createPortal(dialog, document.body) : null}
    </div>
  );
}
