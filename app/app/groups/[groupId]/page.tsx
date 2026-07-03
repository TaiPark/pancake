import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreateSessionDialog } from "@/components/CreateSessionDialog";
import { GroupSettingsDialog } from "@/components/GroupSettingsDialog";
import { KanbanBoard } from "@/components/KanbanBoard";
import { BorderGlow } from "@/components/react-bits/BorderGlow";
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
        <BorderGlow
          animated
          className="reveal"
          backgroundColor="#101218"
          colors={["#73e6c7", "#f2d18b", "#89a8ff"]}
          fillOpacity={0.2}
          glowColor="166 68 68"
          glowIntensity={0.56}
        >
          <section className="grid gap-6 p-5 md:p-6 xl:grid-cols-[1fr_25rem] xl:items-end xl:p-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">Shoot board</p>
              <h1 className="mt-5 max-w-[14ch] text-[2.6rem] font-semibold leading-[0.98] tracking-tight md:text-6xl">
                {group.name}
              </h1>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="studio-metric">
                  <strong>{group.members.length}</strong>
                  <span>位成员</span>
                </div>
                <div className="studio-metric">
                  <strong>{group.sessions.length}</strong>
                  <span>个 Session</span>
                </div>
                <div className="studio-metric">
                  <strong>{group.inviteCode}</strong>
                  <span>群组邀请码</span>
                </div>
              </div>
            </div>
            <div className="studio-card grid gap-4 p-5">
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
                isOwner={isOwner}
                skills={skills}
              />
            </div>
          </section>
        </BorderGlow>

      <KanbanBoard groupId={group.id} sessions={group.sessions} />
      </div>
    </AppShell>
  );
}
