"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createSessionWithAiAction } from "@/app/actions";
import { PendingButton } from "@/components/PendingButton";

type SkillOption = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
};

type CreateSessionDialogProps = {
  groupId: string;
  skills: SkillOption[];
  hasLlmConfig: boolean;
};

export function CreateSessionDialog({ groupId, skills, hasLlmConfig }: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState(skills.find((skill) => skill.isDefault)?.id ?? "");
  const [useAi, setUseAi] = useState(hasLlmConfig);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    formData.set("description", description);
    formData.set("skillId", useAi ? selectedSkillId : "");
    if (useAi) {
      formData.set("useAi", "on");
    } else {
      formData.delete("useAi");
    }

    startTransition(async () => {
      const result = await createSessionWithAiAction(groupId, null, formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  const selectedSkill = skills.find((skill) => skill.id === selectedSkillId);
  const dialog =
    open && typeof document !== "undefined" ? (
      <div className="dialog-overlay" onMouseDown={() => !pending && setOpen(false)}>
        <div className="dialog-content panel p-5 md:p-6" onMouseDown={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">创建拍摄 Session</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                写下足够具体的拍摄意图，AI 会据此填充拍摄前工作流。
              </p>
            </div>
            <button className="button button-secondary min-h-9 px-3 text-sm" disabled={pending} onClick={() => setOpen(false)} type="button">
              关闭
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded-[8px] border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100" role="alert">
              {error}
            </p>
          ) : null}

          <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
            <label className="grid gap-2 text-sm">
              Session 标题
              <input
                className="field"
                maxLength={100}
                name="title"
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
            </label>

            <label className="grid gap-2 text-sm">
              拍摄意图描述
              <textarea
                className="field min-h-40 resize-y"
                maxLength={2000}
                name="description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="描述主题、风格、地点、成员、交付目标和你已经确定的限制..."
                value={description}
              />
              <span className="justify-self-end font-mono text-xs text-[var(--muted)]">{description.length}/2000</span>
            </label>

            {hasLlmConfig ? (
              <label className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] p-3 text-sm">
                <input
                  checked={useAi}
                  className="h-4 w-4 accent-[var(--accent)]"
                  name="useAi"
                  onChange={(event) => setUseAi(event.target.checked)}
                  type="checkbox"
                />
                使用 AI 自动生成拍摄前规划
              </label>
            ) : (
              <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-[var(--muted)]">
                群组尚未配置 LLM，创建后需要手动填写 SPARK 字段。
              </div>
            )}

            {useAi && skills.length > 0 ? (
              <label className="grid gap-2 text-sm">
                选择 Skill
                <select className="field" name="skillId" onChange={(event) => setSelectedSkillId(event.target.value)} value={selectedSkillId}>
                  <option value="">默认生成模板</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                      {skill.isDefault ? " *" : ""}
                    </option>
                  ))}
                </select>
                {selectedSkill?.description ? <span className="text-xs leading-5 text-[var(--muted)]">{selectedSkill.description}</span> : null}
              </label>
            ) : null}

            {useAi && skills.length === 0 ? (
              <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-[var(--muted)]">
                当前使用默认生成模板。需要更专业的提示时，可在群组设置里新建 Skill。
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <PendingButton
                className="button button-primary flex-1"
                disabled={pending || !title.trim()}
                pending={pending}
                pendingText={useAi ? "正在创建并生成..." : "正在创建..."}
              >
                {useAi ? "创建并 AI 生成" : "创建 Session"}
              </PendingButton>
              <button className="button button-secondary" disabled={pending} onClick={() => setOpen(false)} type="button">
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button className="button button-primary" onClick={() => setOpen(true)} type="button">
        创建 Session
      </button>

      {dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
