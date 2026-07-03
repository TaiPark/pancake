import Link from "next/link";
import { ArrowRight, Camera, NotePencil, Trash } from "@phosphor-icons/react/dist/ssr";
import { SessionStage, type Session } from "@prisma/client";
import { deleteSessionAction, updateSessionStageAction } from "@/app/actions";
import { canMoveSessionStage, stageHint, stageLabel } from "@/lib/domain";
import { StageBadge } from "@/components/StageBadge";

const stages: SessionStage[] = [SessionStage.SPARK, SessionStage.PLAN, SessionStage.FEEDBACK];

type BoardSession = Pick<Session, "id" | "title" | "stage" | "updatedAt" | "planMarkdown" | "aiGenerated"> & {
  photos: { id: string }[];
  updatedBy: { name: string } | null;
};

export function KanbanBoard({ groupId, sessions }: { groupId: string; sessions: BoardSession[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {stages.map((stage, index) => {
        const columnSessions = sessions.filter((session) => session.stage === stage);
        return (
          <section
            className="panel reveal min-h-[28rem] p-4"
            key={stage}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <StageBadge stage={stage} />
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{stageHint(stage)}</p>
              </div>
              <span className="font-mono text-sm text-[var(--muted)]">{columnSessions.length}</span>
            </div>

            <div className="grid gap-3">
              {columnSessions.length === 0 ? (
                <div className="rounded-[8px] border border-dashed border-white/12 p-5 text-sm text-[var(--muted)]">
                  这里暂时没有 {stageLabel(stage)} 中的 Session。
                </div>
              ) : null}

              {columnSessions.map((session) => (
                <article
                  className="group rounded-[8px] border border-white/10 bg-[#11100f]/70 p-4 transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/50"
                  key={session.id}
                >
                  <Link href={`/app/groups/${groupId}/sessions/${session.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold tracking-tight">{session.title}</h3>
                      {session.aiGenerated ? (
                        <span className="rounded-full border border-[var(--accent)]/30 px-2 py-0.5 text-xs text-[var(--accent-strong)]">AI</span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                      <span className="inline-flex items-center gap-1">
                        <NotePencil size={14} weight="duotone" />
                        {session.planMarkdown ? "有执行文档" : "待写文档"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Camera size={14} weight="duotone" />
                        {session.photos.length} 张作品
                      </span>
                    </div>
                    <p className="mt-4 text-xs text-[var(--muted)]">
                      {session.updatedBy?.name ? `${session.updatedBy.name} 更新` : "暂无更新记录"}
                    </p>
                  </Link>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {stages
                      .filter((target) => target !== session.stage && canMoveSessionStage(session.stage, target))
                      .map((target) => (
                        <form className="min-w-0 flex-1" action={updateSessionStageAction.bind(null, session.id, target)} key={target}>
                          <button className="button button-secondary min-h-9 w-full px-2 text-xs" type="submit">
                            {stageLabel(target)}
                            <ArrowRight size={14} />
                          </button>
                        </form>
                      ))}
                    <form action={deleteSessionAction.bind(null, session.id)}>
                      <button className="button button-danger min-h-9 px-2 text-xs" type="submit" aria-label={`删除 ${session.title}`}>
                        <Trash size={14} />
                        删除
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
