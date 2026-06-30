import { notFound } from "next/navigation";
import { createSessionAction } from "@/app/actions";
import { KanbanBoard } from "@/components/KanbanBoard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function GroupBoardPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  const { groupId } = await params;
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      members: {
        some: { userId: session!.user.id }
      }
    },
    include: {
      members: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" }
      },
      sessions: {
        include: {
          photos: { select: { id: true } },
          updatedBy: { select: { name: true } }
        },
        orderBy: { updatedAt: "desc" }
      }
    }
  });

  if (!group) {
    notFound();
  }

  return (
    <div className="grid gap-8">
      <section className="reveal grid gap-5 xl:grid-cols-[1fr_25rem] xl:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">Group Board</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">{group.name}</h1>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            <span>邀请码 {group.inviteCode}</span>
            <span>{group.members.length} 位成员</span>
            <span>{group.sessions.length} 个 Session</span>
          </div>
        </div>
        <form action={createSessionAction.bind(null, group.id)} className="panel grid gap-3 p-5">
          <label className="grid gap-2 text-sm">
            新 Session
            <input className="field" name="title" placeholder="例如：雨后便利店人像" required minLength={2} />
          </label>
          <button className="button button-primary" type="submit">
            创建 Session
          </button>
        </form>
      </section>

      <KanbanBoard groupId={group.id} sessions={group.sessions} />
    </div>
  );
}
