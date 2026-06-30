import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-12">
      <section className="grid w-full max-w-5xl gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-end">
        <div className="reveal">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">Pancake</p>
          <h2 className="mt-5 max-w-[10ch] text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">
            别让好点子只停在群聊里。
          </h2>
          <p className="mt-6 max-w-[34ch] leading-7 text-[var(--muted)]">
            从摄影主题到拍摄策划，再到作品反馈，把小组的创作过程留在同一个地方。
          </p>
        </div>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
