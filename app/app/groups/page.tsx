import Link from "next/link";
import { redirect } from "next/navigation";
import { createGroupAction, joinGroupAction } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { DeleteGroupButton } from "@/components/DeleteGroupButton";
import { PendingButton } from "@/components/PendingButton";
import { BorderGlow } from "@/components/react-bits/BorderGlow";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const [currentUser, groups] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true }
    }),
    prisma.group.findMany({
      where: {
        members: {
          some: { userId: session!.user.id }
        }
      },
      include: {
        _count: { select: { sessions: true, members: true } }
      },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const hasGroups = groups.length > 0;

  return (
    <AppShell displayName={currentUser?.name ?? session.user.name ?? "成员"}>
      <div className="grid gap-8">
        <BorderGlow
          animated
          className="reveal"
          backgroundColor="#101218"
          colors={["#73e6c7", "#f2d18b", "#89a8ff"]}
          fillOpacity={0.2}
          glowColor="166 68 68"
          glowIntensity={0.56}
        >
          <section className={`grid gap-6 p-5 md:p-6 lg:p-8 ${hasGroups ? "" : "lg:grid-cols-[1.08fr_0.92fr] lg:items-end"}`}>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">Creative groups</p>
              <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.02] tracking-tight md:text-5xl">
                选择创作小组
              </h1>
              <p className="mt-5 max-w-[48ch] leading-7 text-[var(--muted)]">
                PancakeHub 按群组组织拍摄前准备、现场执行和拍后复盘。每个群组都有自己的拍摄计划看板。
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="studio-metric">
                  <strong>{groups.length}</strong>
                  <span>已加入小组</span>
                </div>
                <div className="studio-metric">
                  <strong>{groups.reduce((count, group) => count + group._count.sessions, 0)}</strong>
                  <span>进行中的拍摄计划</span>
                </div>
                <div className="studio-metric">
                  <strong>3</strong>
                  <span>拍摄流程阶段</span>
                </div>
              </div>
            </div>
            {!hasGroups ? (
              <div aria-label="开始创建或加入小组" className="studio-card grid gap-4 p-5">
                <form action={createGroupAction} className="grid gap-3">
                  <label className="grid gap-2 text-sm">
                    新群组名称
                    <input className="field" name="name" required minLength={2} />
                  </label>
                  <PendingButton className="button button-primary" pendingText="正在创建群组...">
                    创建群组
                  </PendingButton>
                </form>
                <div className="h-px bg-white/10" />
                <form action={joinGroupAction} className="grid gap-3">
                  <label className="grid gap-2 text-sm">
                    邀请码
                    <input className="field uppercase" name="inviteCode" required minLength={4} />
                  </label>
                  {params.error === "invalid-invite" ? <p className="text-sm text-red-200">邀请码无效。</p> : null}
                  <PendingButton className="button button-secondary" pendingText="正在加入群组...">
                    加入群组
                  </PendingButton>
                </form>
              </div>
            ) : null}
          </section>
        </BorderGlow>

      <section aria-label="已加入的小组" className="grid gap-4">
        {hasGroups ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">已有小组</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">优先进入已有协作空间继续推进拍摄。</p>
            </div>
            <span className="font-mono text-sm text-[var(--muted)]">{groups.length}</span>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.length === 0 ? (
          <div className="panel p-8 text-[var(--muted)] md:col-span-2 xl:col-span-3">
            还没有群组。创建一个，或者向朋友要邀请码加入。
          </div>
        ) : null}

        {groups.map((group) => (
          <article
            className="panel reveal relative grid gap-5 p-5 pr-16 transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/50"
            key={group.id}
          >
            <Link className="block" href={`/app/groups/${group.id}`}>
              <h2 className="text-2xl font-semibold tracking-tight">{group.name}</h2>
              <p className="mt-5 font-mono text-xs text-[var(--muted)]">邀请码 {group.inviteCode}</p>
              <div className="mt-6 flex gap-5 text-sm text-[var(--muted)]">
                <span>{group._count.sessions} 个拍摄计划</span>
                <span>{group._count.members} 位成员</span>
              </div>
            </Link>
            {group.ownerId === session.user.id ? <DeleteGroupButton groupId={group.id} groupName={group.name} /> : null}
          </article>
        ))}
        </div>
      </section>
      {hasGroups ? (
        <section aria-label={groups.length > 0 ? "创建或加入小组" : "开始创建或加入小组"} className="studio-card grid gap-4 p-5 md:grid-cols-2">
          <form action={createGroupAction} className="grid gap-3">
            <label className="grid gap-2 text-sm">
              新群组名称
              <input className="field" name="name" required minLength={2} />
            </label>
            <PendingButton className="button button-primary" pendingText="正在创建群组...">
              创建群组
            </PendingButton>
          </form>
          <form action={joinGroupAction} className="grid gap-3 md:border-l md:border-white/10 md:pl-5">
            <label className="grid gap-2 text-sm">
              邀请码
              <input className="field uppercase" name="inviteCode" required minLength={4} />
            </label>
            {params.error === "invalid-invite" ? <p className="text-sm text-red-200">邀请码无效。</p> : null}
            <PendingButton className="button button-secondary" pendingText="正在加入群组...">
              加入群组
            </PendingButton>
          </form>
        </section>
      ) : null}
      </div>
    </AppShell>
  );
}
