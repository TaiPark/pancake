"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, signupAction } from "@/app/actions";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="panel reveal grid gap-5 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
          {mode === "login" ? "回到拍摄现场" : "创建 Pancake 账号"}
        </h1>
        <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[var(--muted)]">
          {mode === "login"
            ? "继续整理群组里的灵感、策划和作品反馈。"
            : "给摄影小组一个能沉淀想法和作品的暗房。"}
        </p>
      </div>

      {mode === "signup" ? (
        <label className="grid gap-2 text-sm">
          昵称
          <input className="field" name="name" autoComplete="name" required minLength={2} />
        </label>
      ) : null}

      <label className="grid gap-2 text-sm">
        邮箱
        <input className="field" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="grid gap-2 text-sm">
        密码
        <input
          className="field"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
        />
      </label>

      {state?.error ? (
        <p className="rounded-[8px] border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
          {state.error}
        </p>
      ) : null}

      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? "处理中" : mode === "login" ? "登录" : "注册并进入"}
      </button>

      <p className="text-sm text-[var(--muted)]">
        {mode === "login" ? "还没有账号？" : "已经有账号？"}
        <Link className="ml-2 text-[var(--accent-strong)]" href={mode === "login" ? "/signup" : "/login"}>
          {mode === "login" ? "去注册" : "去登录"}
        </Link>
      </p>
    </form>
  );
}
