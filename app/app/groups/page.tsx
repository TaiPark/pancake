import Link from "next/link";
import { redirect } from "next/navigation";
import { createGroupAction, joinGroupAction } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: { userId: session!.user.id }
      }
    },
    include: {
      _count: { select: { sessions: true, members: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <AppShell email={session.user.email}>
      <div className="grid gap-8">
      <section className="reveal grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div>
          <h1 className="max-w-[12ch] text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">
            选择一个创作小组。
          </h1>
          <p className="mt-5 max-w-[48ch] leading-7 text-[var(--muted)]">
            Pancake 按群组组织拍摄前准备、拍摄中执行和拍摄后复盘。每个群组都有自己的 Session 看板。
          </p>
        </div>
        <div className="panel grid gap-4 p-5">
          <form action={createGroupAction} className="grid gap-3">
            <label className="grid gap-2 text-sm">
              新群组名称
              <input className="field" name="name" placeholder="例如：周末夜景小队" required minLength={2} />
            </label>
            <button className="button button-primary" type="submit">
              创建群组
            </button>
          </form>
          <div className="h-px bg-white/10" />
          <form action={joinGroupAction} className="grid gap-3">
            <label className="grid gap-2 text-sm">
              邀请码
              <input className="field uppercase" name="inviteCode" placeholder="8 位邀请码" required minLength={4} />
            </label>
            {params.error === "invalid-invite" ? <p className="text-sm text-red-200">邀请码无效。</p> : null}
            <button className="button button-secondary" type="submit">
              加入群组
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.length === 0 ? (
          <div className="panel p-8 text-[var(--muted)] md:col-span-2 xl:col-span-3">
            还没有群组。创建一个，或者向朋友要邀请码加入。
          </div>
        ) : null}

        {groups.map((group) => (
          <Link
            className="panel reveal block p-5 transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/50"
            href={`/app/groups/${group.id}`}
            key={group.id}
          >
            <h2 className="text-2xl font-semibold tracking-tight">{group.name}</h2>
            <p className="mt-5 font-mono text-xs text-[var(--muted)]">邀请码 {group.inviteCode}</p>
            <div className="mt-6 flex gap-5 text-sm text-[var(--muted)]">
              <span>{group._count.sessions} 个 Session</span>
              <span>{group._count.members} 位成员</span>
            </div>
          </Link>
        ))}
      </section>
      </div>
    </AppShell>
  );
}
