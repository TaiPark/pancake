import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="relative z-10 grid min-h-[100dvh] place-items-center px-4 py-12">
      <section className="grid w-full max-w-5xl gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center">
        <div className="reveal">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">Pancake</p>
          <h2 className="mt-5 max-w-[10ch] text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
            给每次拍摄一个房间。
          </h2>
          <p className="mt-6 max-w-[34ch] leading-7 text-[var(--muted)]">
            使用邀请码进入内测，把拍摄前、中、后的所有协作留在一个工作台。
          </p>
        </div>
        <AuthForm mode="signup" />
      </section>
    </main>
  );
}
