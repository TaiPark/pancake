"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      if (mode === "signup") {
        const response = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: String(formData.get("name") ?? ""),
            email,
            password
          })
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          setError(body?.error ?? "注册失败，请稍后再试");
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setError(mode === "login" ? "邮箱或密码不正确" : "账号已创建，但自动登录失败");
        return;
      }

      router.push("/app/groups");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="panel reveal grid gap-5 p-6 md:p-8">
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

      {error ? (
        <p className="rounded-[8px] border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
          {error}
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
