import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { updateSparkAction } from "@/app/actions";
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
  const workflowFields = workflowSections.flatMap((section) => section.fields);
  const completedFields = workflowFields.filter((field) => spark[field.name].trim().length > 0).length;
  const activeSection = workflowSections.find((section) => section.stage === session.stage);

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
          <section className="grid gap-6 p-5 md:p-6 lg:grid-cols-[1fr_0.9fr] lg:items-end lg:p-8">
            <div>
              <Link className="button button-secondary w-fit min-h-10 px-3 text-sm" href={`/app/groups/${groupId}`}>
                <ArrowLeft size={16} weight="bold" />
                返回 {session.group.name}
              </Link>
              <h1 className="mt-6 max-w-[14ch] text-[2.6rem] font-semibold leading-[0.98] tracking-tight md:text-6xl">
                {session.title}
              </h1>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="studio-metric">
                <strong>{activeSection?.title ?? stageLabel(session.stage)}</strong>
                <span>当前阶段</span>
              </div>
              <div className="studio-metric">
                <strong>
                  {completedFields}/{workflowFields.length}
                </strong>
                <span>已填写字段</span>
              </div>
              <div className="studio-metric">
                <strong>{session.updatedBy?.name ?? "未知成员"}</strong>
                <span>{session.updatedAt.toLocaleString("zh-CN")} 更新</span>
              </div>
            </div>
          </section>
        </BorderGlow>

        <section className="grid gap-4">
          <WorkflowEditor
            sessionId={session.id}
            currentStage={session.stage}
            sections={workflowSections}
            spark={spark}
            updateAction={updateSparkAction.bind(null, session.id)}
            aiGenerated={session.aiGenerated}
            aiRawResponse={session.aiRawResponse}
            hasLlmConfig={Boolean(llmConfig)}
            description={session.description}
          />
        </section>

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
      </div>
    </AppShell>
  );
}
