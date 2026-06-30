import { SessionStage } from "@prisma/client";
import { stageLabel } from "@/lib/domain";

const stageTone: Record<SessionStage, string> = {
  SPARK: "border-amber-300/25 bg-amber-400/10 text-amber-100",
  PLAN: "border-sky-300/25 bg-sky-400/10 text-sky-100",
  FEEDBACK: "border-rose-300/25 bg-rose-400/10 text-rose-100"
};

export function StageBadge({ stage }: { stage: SessionStage }) {
  return (
    <span className={`inline-flex rounded-[8px] border px-2.5 py-1 text-xs font-medium ${stageTone[stage]}`}>
      {stageLabel(stage)}
    </span>
  );
}
