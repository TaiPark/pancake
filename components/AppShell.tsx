import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { PendingButton } from "@/components/PendingButton";
import { APP_NAME, APP_SLOGAN } from "@/lib/brand";

export function AppShell({ children, displayName }: { children: React.ReactNode; displayName?: string | null }) {
  return (
    <main className="relative z-10 min-h-[100dvh] px-4 py-5 md:px-8">
      <header className="app-nav mx-auto flex h-16 max-w-[1440px] items-center justify-between px-3 md:px-4">
        <Link href="/app/groups" className="flex min-w-0 items-baseline gap-3">
          <span className="text-xl font-semibold tracking-tight">{APP_NAME}</span>
          <span className="hidden truncate text-sm text-[var(--muted)] sm:inline">{APP_SLOGAN}</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-[var(--muted)] md:block">{displayName}</span>
          <form action={logoutAction}>
            <PendingButton className="button button-secondary min-h-10 px-3" pendingText="退出中...">
              退出
            </PendingButton>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] py-8">{children}</div>
    </main>
  );
}
