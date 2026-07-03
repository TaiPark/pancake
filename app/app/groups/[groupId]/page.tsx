import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreateSessionDialog } from "@/components/CreateSessionDialog";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LlmConfigPanel } from "@/components/LlmConfigPanel";
import { SkillManager } from "@/components/SkillManager";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeFieldHints(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

export default async function GroupBoardPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { groupId } = await params;
  const [currentUser, group] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true }
    }),
    prisma.group.findFirst({
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
        llmConfig: true,
        skills: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
        },
        sessions: {
          include: {
            photos: { select: { id: true } },
            updatedBy: { select: { name: true } }
          },
          orderBy: { updatedAt: "desc" }
        }
      }
    })
  ]);

  if (!group) {
    notFound();
  }

  const currentMembership = group.members.find((member) => member.userId === session.user.id);
  const isOwner = currentMembership?.role === "OWNER";
  const skills = group.skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    systemPrompt: skill.systemPrompt,
    fieldHints: normalizeFieldHints(skill.fieldHints),
    isDefault: skill.isDefault
  }));

  return (
    <AppShell displayName={currentUser?.name ?? session.user.name ?? "成员"}>
      <div className="grid gap-8">
      <section className="reveal grid gap-5 xl:grid-cols-[1fr_25rem] xl:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">Shoot Board</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">{group.name}</h1>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            <span>邀请码 {group.inviteCode}</span>
            <span>{group.members.length} 位成员</span>
            <span>{group.sessions.length} 个 Session</span>
          </div>
        </div>
        <div className="panel grid gap-4 p-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">新的拍摄计划</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              输入标题和详细描述，选择是否用 AI 填充拍摄前工作流。
            </p>
          </div>
          <CreateSessionDialog
            groupId={group.id}
            hasLlmConfig={Boolean(group.llmConfig)}
            skills={skills.map((skill) => ({
              id: skill.id,
              name: skill.name,
              description: skill.description,
              isDefault: skill.isDefault
            }))}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <LlmConfigPanel
          existingConfig={
            group.llmConfig
              ? {
                  apiKey: group.llmConfig.apiKey,
                  baseUrl: group.llmConfig.baseUrl,
                  model: group.llmConfig.model,
                  temperature: group.llmConfig.temperature,
                  maxTokens: group.llmConfig.maxTokens
                }
              : null
          }
          groupId={group.id}
          isOwner={isOwner}
        />
        <SkillManager groupId={group.id} isOwner={isOwner} skills={skills} />
      </section>

      <KanbanBoard groupId={group.id} sessions={group.sessions} />
      </div>
    </AppShell>
  );
}
