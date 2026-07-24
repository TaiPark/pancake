import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { SessionStage } from "@prisma/client";
import { saveWorkflowStageAction } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { PhotoMasonry } from "@/components/PhotoMasonry";
import { PhotoUploader } from "@/components/PhotoUploader";
import { BorderGlow } from "@/components/react-bits/BorderGlow";
import { WorkflowEditor } from "@/components/WorkflowEditor";
import { auth } from "@/lib/auth";
import { parseSparkFields, stageLabel, workflowSections } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { publicPhotoUrl } from "@/lib/storage";

export default async function SessionPage({
  params
}: {
  params: Promise<{ groupId: string; sessionId: string }>;
}) {
  const authSession = await auth();
  if (!authSession?.user?.id) {
    redirect("/login");
  }

  const { groupId, sessionId } = await params;
  const [currentUser, session, llmConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authSession.user.id },
      select: { name: true }
    }),
    prisma.session.findFirst({
      where: {
        id: sessionId,
        groupId,
        group: {
          members: {
            some: { userId: authSession!.user.id }
          }
        }
      },
      include: {
        group: { select: { id: true, name: true } },
        photos: { orderBy: { createdAt: "desc" } },
        updatedBy: { select: { name: true } }
      }
    }),
    prisma.llmConfig.findUnique({
      where: { groupId },
      select: { id: true }
    })
  ]);

  if (!session) {
    notFound();
  }

  const spark = parseSparkFields(session.sparkFields);
  const activeSection = workflowSections.find((section) => section.stage === session.stage) ?? workflowSections[0];
  const completedFields = activeSection.fields.filter((field) => spark[field.name].trim().length > 0).length;
  const showPhotoWorkspace = session.stage === SessionStage.FEEDBACK;

  return (
    <AppShell displayName={currentUser?.name ?? authSession.user.name ?? "成员"}>
      <div className="grid gap-6">
        <BorderGlow
          animated
          className="reveal"
          backgroundColor="#101218"
          colors={["#73e6c7", "#f2d18b", "#89a8ff"]}
          fillOpacity={0.2}
          glowColor="166 68 68"
          glowIntensity={0.56}
        >
          <section className="grid gap-5 p-5 md:p-6">
            <Link className="button button-secondary w-fit min-h-10 px-3 text-sm" href={`/app/groups/${groupId}`}>
              <ArrowLeft size={16} weight="bold" />
              返回 {session.group.name}
            </Link>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-xs text-[var(--accent-strong)]">{stageLabel(session.stage)} · 当前阶段</p>
                <h1 className="mt-3 max-w-[18ch] text-[2.35rem] font-semibold leading-[1] tracking-tight md:text-5xl">
                  {session.title}
                </h1>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="studio-metric">
                  <strong>
                    {completedFields}/{activeSection.fields.length}
                  </strong>
                  <span>当前阶段已填写</span>
                </div>
                <div className="studio-metric">
                  <strong>{session.updatedBy?.name ?? "未知成员"}</strong>
                  <span>{session.updatedAt.toLocaleString("zh-CN")} 更新</span>
                </div>
              </div>
            </div>
          </section>
        </BorderGlow>

        <section className="grid gap-4">
          <WorkflowEditor
            key={session.stage}
            sessionId={session.id}
            currentStage={session.stage}
            sections={workflowSections}
            spark={spark}
            saveAction={saveWorkflowStageAction.bind(null, session.id)}
            aiGenerated={session.aiGenerated}
            aiRawResponse={session.aiRawResponse}
            hasLlmConfig={Boolean(llmConfig)}
            description={session.description}
          />
        </section>

        {showPhotoWorkspace ? (
          <section className="grid gap-4 xl:grid-cols-[22rem_1fr]">
            <div className="grid content-start gap-4">
              <article className="panel p-5">
                <h2 className="text-2xl font-semibold tracking-tight">拍摄后作品池</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  上传完成片或样片，配合选片、修图和复盘字段一起沉淀。
                </p>
              </article>
              <PhotoUploader sessionId={session.id} />
            </div>
            <PhotoMasonry
              photos={session.photos.map((photo) => ({
                id: photo.id,
                src: publicPhotoUrl(photo.objectKey),
                width: photo.width,
                height: photo.height,
                caption: photo.caption
              }))}
            />
          </section>
        ) : (
          <section className="panel p-5">
            <h2 className="text-xl font-semibold tracking-tight">作品与反馈</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              进入拍摄后阶段后，可在这里上传样片、成片并记录反馈。
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
