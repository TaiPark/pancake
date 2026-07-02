import Link from "next/link";
import { logoutAction } from "@/app/actions";

export function AppShell({ children, email }: { children: React.ReactNode; email?: string | null }) {
  return (
    <main className="relative z-10 min-h-[100dvh] px-4 py-5 md:px-8">
      <header className="mx-auto flex h-16 max-w-[1440px] items-center justify-between border-b border-white/10">
        <Link href="/app/groups" className="flex items-baseline gap-3">
          <span className="text-xl font-semibold tracking-tight">pancake</span>
          <span className="hidden text-sm text-[var(--muted)] sm:inline">画大饼，也把饼拍出来</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-[var(--muted)] md:block">{email}</span>
          <form action={logoutAction}>
            <button className="button button-secondary min-h-10 px-3" type="submit">
              退出
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] py-8">{children}</div>
    </main>
  );
}
