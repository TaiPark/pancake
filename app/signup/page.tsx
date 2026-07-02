import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-12">
      <section className="grid w-full max-w-5xl gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-end">
        <div className="reveal">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">Pancake</p>
          <h2 className="mt-5 max-w-[10ch] text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">
            给每次拍摄一个房间。
          </h2>
          <p className="mt-6 max-w-[34ch] leading-7 text-[var(--muted)]">
            小组成员一起记录灵感、修订 Markdown 策划，并回看最后交出的照片。
          </p>
        </div>
        <AuthForm mode="signup" />
      </section>
    </main>
  );
}
