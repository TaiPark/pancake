"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createSkillAction, deleteSkillAction, updateSkillAction } from "@/app/actions";
import { PendingButton } from "@/components/PendingButton";

type Skill = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  fieldHints: Record<string, string>;
  isDefault: boolean;
};

type SkillManagerProps = {
  groupId: string;
  skills: Skill[];
  isOwner: boolean;
};

const emptySkill: Skill = {
  id: "",
  name: "",
  description: "",
  systemPrompt: "",
  fieldHints: {},
  isDefault: false
};

export function SkillManager({ groupId, skills, isOwner }: SkillManagerProps) {
  const [editing, setEditing] = useState<Skill | null>(null);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldHintsText = useMemo(() => JSON.stringify(editing?.fieldHints ?? {}, null, 2), [editing]);

  function submitSkill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setError("");

    const formData = new FormData(event.currentTarget);
    setPendingAction("save");
    startTransition(async () => {
      const result = editing.id
        ? await updateSkillAction(editing.id, null, formData)
        : await createSkillAction(groupId, null, formData);
      if (result.error) {
        setError(result.error);
        setPendingAction(null);
        return;
      }
      setEditing(null);
      setPendingAction(null);
    });
  }

  function removeSkill(skillId: string) {
    setPendingAction(`delete:${skillId}`);
    startTransition(async () => {
      const result = await deleteSkillAction(skillId);
      if (result.error) {
        setError(result.error);
      }
      setPendingAction(null);
    });
  }

  const editor =
    editing && typeof document !== "undefined" ? (
      <div className="dialog-overlay" onMouseDown={() => !pending && setEditing(null)}>
        <form className="dialog-content panel grid gap-4 p-5 md:p-6" onMouseDown={(event) => event.stopPropagation()} onSubmit={submitSkill}>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">{editing.id ? "编辑生成模板" : "新建生成模板"}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">字段提示必须是 JSON 对象，键名对应拍摄前字段。</p>
          </div>
          {error ? <p className="rounded-[8px] border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">{error}</p> : null}
          <label className="grid gap-2 text-sm">
            名称
            <input className="field" defaultValue={editing.name} maxLength={50} name="name" required />
          </label>
          <label className="grid gap-2 text-sm">
            描述
            <input className="field" defaultValue={editing.description} maxLength={200} name="description" />
          </label>
          <label className="grid gap-2 text-sm">
            系统提示词
            <textarea className="field min-h-32" defaultValue={editing.systemPrompt} maxLength={2000} name="systemPrompt" required />
          </label>
          <label className="grid gap-2 text-sm">
            字段提示 JSON
            <textarea className="field min-h-36 font-mono text-xs leading-5" defaultValue={fieldHintsText} name="fieldHints" />
          </label>
          <label className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] p-3 text-sm">
            <input className="h-4 w-4 accent-[var(--accent)]" defaultChecked={editing.isDefault} name="isDefault" type="checkbox" />
            设为默认模板
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PendingButton
              className="button button-primary flex-1"
              disabled={pending}
              pending={pending && pendingAction === "save"}
              pendingText="保存中..."
            >
              保存模板
            </PendingButton>
            <button className="button button-secondary" disabled={pending} onClick={() => setEditing(null)} type="button">
              取消
            </button>
          </div>
        </form>
      </div>
    ) : null;

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">生成模板</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">模板用于控制 AI 生成拍摄规划时的风格和重点。</p>
        </div>
        {isOwner ? (
          <button className="button button-secondary min-h-10 px-3 text-sm" onClick={() => setEditing(emptySkill)} type="button">
            新建模板
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-[8px] border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">{error}</p> : null}

      <div className="mt-5 grid gap-3">
        {skills.length === 0 ? (
          <p className="rounded-[8px] border border-dashed border-white/12 p-4 text-sm leading-6 text-[var(--muted)]">
            未创建自定义模板时，PancakeHub 会使用默认生成模板。
          </p>
        ) : null}
        {skills.map((skill) => (
          <article className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4" key={skill.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{skill.name}</h3>
                  {skill.isDefault ? <span className="rounded-full border border-[var(--accent)]/30 px-2 py-0.5 text-xs text-[var(--accent-strong)]">默认</span> : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{skill.description || "没有描述"}</p>
              </div>
              {isOwner ? (
                <div className="flex gap-2">
                  <button className="button button-secondary min-h-9 px-3 text-xs" onClick={() => setEditing(skill)} type="button">
                    编辑
                  </button>
                  <PendingButton
                    className="button button-danger min-h-9 px-3 text-xs"
                    disabled={pending}
                    onClick={() => removeSkill(skill.id)}
                    pending={pending && pendingAction === `delete:${skill.id}`}
                    pendingText="删除中..."
                    type="button"
                  >
                    删除
                  </PendingButton>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {editor ? createPortal(editor, document.body) : null}
    </section>
  );
}
