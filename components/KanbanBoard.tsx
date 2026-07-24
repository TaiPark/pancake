import Link from "next/link";
import { ArrowRight, CalendarBlank, Camera, NotePencil } from "@phosphor-icons/react/dist/ssr";
import { SessionStage, type Session } from "@prisma/client";
import type { CSSProperties } from "react";
import { updateSessionStageAction } from "@/app/actions";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { canMoveSessionStage, extractThemeTags, formatExpectedShootTime, parseSparkFields, stageHint, stageLabel } from "@/lib/domain";
import { PendingButton } from "@/components/PendingButton";
import { StageBadge } from "@/components/StageBadge";

const stages: SessionStage[] = [SessionStage.SPARK, SessionStage.PLAN, SessionStage.FEEDBACK];

type BoardSession = Pick<Session, "id" | "title" | "stage" | "updatedAt" | "expectedShootAt" | "sparkFields" | "planMarkdown" | "aiGenerated"> & {
  photos: { id: string }[];
  updatedBy: { name: string } | null;
};

export function KanbanBoard({ groupId, sessions }: { groupId: string; sessions: BoardSession[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {stages.map((stage, index) => {
        const columnSessions = sessions.filter((session) => session.stage === stage);
        const mobileOrder = columnSessions.length > 0 ? index : stages.length + index;
        return (
          <section
            className="kanban-column panel reveal p-4"
            key={stage}
            style={{ "--mobile-order": mobileOrder, animationDelay: `${index * 80}ms` } as CSSProperties}
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
                <div className="studio-card border-dashed p-5 text-sm text-[var(--muted)]">
                  这里暂时没有 {stageLabel(stage)} 中的拍摄计划。
                </div>
              ) : null}

              {columnSessions.map((session) => {
                const spark = parseSparkFields(session.sparkFields);
                const themeTags = extractThemeTags(spark.theme);
                const expectedShootTime = formatExpectedShootTime(session.expectedShootAt);

                return (
                  <article
                    className="studio-card group p-4 transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/50"
                    key={session.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link className="min-w-0 flex-1" href={`/app/groups/${groupId}/sessions/${session.id}`}>
                        <h3 className="text-lg font-semibold tracking-tight">{session.title}</h3>
                      </Link>
                      <div className="session-card-actions flex shrink-0 items-center gap-1.5">
                        {session.aiGenerated ? (
                          <span className="rounded-full border border-[var(--accent)]/30 px-2 py-0.5 text-xs text-[var(--accent-strong)]">AI</span>
                        ) : null}
                        <DeleteSessionButton sessionId={session.id} sessionTitle={session.title} />
                      </div>
                    </div>
                    <Link href={`/app/groups/${groupId}/sessions/${session.id}`}>
                      {themeTags.length > 0 ? (
                        <div className="shoot-plan-tags mt-3 flex flex-wrap gap-1.5">
                          {themeTags.map((tag) => (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-[var(--text)]/80" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                        <span className="inline-flex items-center gap-1">
                          <NotePencil size={14} weight="duotone" />
                          {session.planMarkdown ? "有执行文档" : "待写文档"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Camera size={14} weight="duotone" />
                          {session.photos.length} 张作品
                        </span>
                        {expectedShootTime ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarBlank size={14} weight="duotone" />
                            预计拍摄 {expectedShootTime}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-4 text-xs text-[var(--muted)]">
                        {session.updatedBy?.name ? `${session.updatedBy.name} 更新` : "暂无更新记录"}
                      </p>
                    </Link>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link className="button button-primary min-h-11 min-w-0 flex-1 px-2 text-xs" href={`/app/groups/${groupId}/sessions/${session.id}`}>
                        继续处理{stageLabel(session.stage)}任务
                        <ArrowRight size={14} />
                      </Link>
                      {stages
                        .filter((target) => target !== session.stage && canMoveSessionStage(session.stage, target))
                        .map((target) => (
                          <form className="min-w-0 flex-1" action={updateSessionStageAction.bind(null, session.id, target)} key={target}>
                            <PendingButton className="button button-secondary min-h-11 w-full px-2 text-xs" pendingText={`正在进入${stageLabel(target)}...`}>
                              进入{stageLabel(target)}
                              <ArrowRight size={14} />
                            </PendingButton>
                          </form>
                        ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
