"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "motion/react";

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
    const inviteCode = String(formData.get("inviteCode") ?? "");

    startTransition(async () => {
      if (mode === "signup") {
        const response = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: String(formData.get("name") ?? ""),
            email,
            password,
            inviteCode
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
    <motion.form
      onSubmit={onSubmit}
      className="panel reveal grid gap-5 p-6 md:p-8"
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0, y: 18, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.055 } }
      }}
    >
      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
          {mode === "login" ? "回到拍摄现场" : "创建 Pancake 账号"}
        </h1>
        <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[var(--muted)]">
          {mode === "login"
            ? "继续推进群组里的拍摄前准备、现场记录和拍后复盘。"
            : "邀请码验证后即可创建账号，进入摄影协作工作台。"}
        </p>
      </motion.div>

      {mode === "signup" ? (
        <motion.label className="grid gap-2 text-sm" variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          昵称
          <input className="field" name="name" autoComplete="name" required minLength={2} />
        </motion.label>
      ) : null}

      {mode === "signup" ? (
        <motion.label className="grid gap-2 text-sm" variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          注册邀请码
          <input
            className="field uppercase"
            name="inviteCode"
            autoComplete="one-time-code"
            placeholder="BILIGO"
            required
          />
          <span className="text-xs leading-5 text-[var(--muted)]">当前内测注册需要邀请码。</span>
        </motion.label>
      ) : null}

      <motion.label className="grid gap-2 text-sm" variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
        邮箱
        <input className="field" name="email" type="email" autoComplete="email" required />
      </motion.label>
      <motion.label className="grid gap-2 text-sm" variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
        密码
        <input
          className="field"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
        />
      </motion.label>

      {error ? (
        <p aria-live="polite" className="rounded-[8px] border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <motion.button
        className="button button-primary"
        type="submit"
        disabled={pending}
        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
        whileHover={{ y: -2 }}
        whileTap={{ y: 1, scale: 0.99 }}
      >
        {pending ? "处理中" : mode === "login" ? "登录" : "注册并进入"}
      </motion.button>

      <motion.p className="text-sm text-[var(--muted)]" variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
        {mode === "login" ? "还没有账号？" : "已经有账号？"}
        <Link className="ml-2 text-[var(--accent-strong)]" href={mode === "login" ? "/signup" : "/login"}>
          {mode === "login" ? "去注册" : "去登录"}
        </Link>
      </motion.p>
    </motion.form>
  );
}
