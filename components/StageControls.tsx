import { SessionStage } from "@prisma/client";
import { updateSessionStageAction } from "@/app/actions";
import { canMoveSessionStage, stageLabel } from "@/lib/domain";
import { PendingButton } from "@/components/PendingButton";
import { StageBadge } from "@/components/StageBadge";

const stages: SessionStage[] = [SessionStage.SPARK, SessionStage.PLAN, SessionStage.FEEDBACK];

export function StageControls({ sessionId, stage }: { sessionId: string; stage: SessionStage }) {
  return (
    <div className="panel flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <StageBadge stage={stage} />
        <p className="mt-2 text-sm text-[var(--muted)]">按拍摄前、中、后的顺序推进；可回退相邻阶段补资料。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {stages.map((target) => (
          <form action={updateSessionStageAction.bind(null, sessionId, target)} key={target}>
            <PendingButton
              className={`button min-h-10 px-3 text-sm ${target === stage ? "button-primary" : "button-secondary"}`}
              disabled={!canMoveSessionStage(stage, target)}
              pendingText={`正在切换到${stageLabel(target)}...`}
            >
              {stageLabel(target)}
            </PendingButton>
          </form>
        ))}
      </div>
    </div>
  );
}
