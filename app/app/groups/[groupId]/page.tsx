import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreateSessionDialog } from "@/components/CreateSessionDialog";
import { GroupSettingsDialog } from "@/components/GroupSettingsDialog";
import { InviteCodeButton } from "@/components/InviteCodeButton";
import { KanbanBoard } from "@/components/KanbanBoard";
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
      <div className="grid gap-6">
        <section className="panel reveal grid gap-5 p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">Shoot board</p>
              <h1 className="mt-3 max-w-[18ch] text-[2.35rem] font-semibold leading-none tracking-tight md:text-5xl">
                {group.name}
              </h1>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {group.members.length} 位成员 · {group.sessions.length} 个拍摄计划
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InviteCodeButton code={group.inviteCode} />
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
          </div>
        </section>

        <section className="grid gap-4">
          <div>
            <p className="font-mono text-xs text-[var(--accent-strong)]">当前任务</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">继续正在进行的拍摄</h2>
          </div>
          <KanbanBoard groupId={group.id} sessions={group.sessions} />
        </section>

        {isOwner ? (
          <section className="panel grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
            <div>
              <p className="font-mono text-xs text-[var(--accent-strong)]">仅群主可见</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">群组与 AI 设置</h2>
              <p className="mt-2 max-w-[62ch] text-sm leading-6 text-[var(--muted)]">
                管理模型配置和生成模板。日常拍摄任务不需要进入这里。
              </p>
            </div>
            <GroupSettingsDialog
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
              skills={skills}
            />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
