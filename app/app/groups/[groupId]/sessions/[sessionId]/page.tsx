import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { updatePlanAction, updateSparkAction } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { PhotoMasonry } from "@/components/PhotoMasonry";
import { PhotoUploader } from "@/components/PhotoUploader";
import { WorkflowEditor } from "@/components/WorkflowEditor";
import { auth } from "@/lib/auth";
import { defaultPlanMarkdown, parseSparkFields, stageLabel, workflowSections } from "@/lib/domain";
import { renderMarkdown } from "@/lib/markdown";
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
  const renderedPlan = await renderMarkdown(session.planMarkdown || defaultPlanMarkdown);
  const workflowFields = workflowSections.flatMap((section) => section.fields);
  const completedFields = workflowFields.filter((field) => spark[field.name].trim().length > 0).length;
  const activeSection = workflowSections.find((section) => section.stage === session.stage);

  return (
    <AppShell displayName={currentUser?.name ?? authSession.user.name ?? "成员"}>
      <div className="grid gap-6">
      <section className="reveal grid gap-4">
        <Link className="button button-secondary w-fit min-h-10 px-3 text-sm" href={`/app/groups/${groupId}`}>
          <ArrowLeft size={16} weight="bold" />
          返回 {session.group.name}
        </Link>
        <div className="grid gap-4">
          <div>
            <h1 className="max-w-[14ch] text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">
              {session.title}
            </h1>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
              <span>当前：{activeSection?.title ?? stageLabel(session.stage)}</span>
              <span>{completedFields}/{workflowFields.length} 项已填写</span>
              <span>最后更新：{session.updatedBy?.name ?? "未知成员"}，{session.updatedAt.toLocaleString("zh-CN")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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

        <div className="grid content-start gap-4 xl:sticky xl:top-6">
          <form action={updatePlanAction.bind(null, session.id)} className="panel grid gap-4 p-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">执行文档</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">自由补充正式通告、分镜脚本和交付说明。</p>
            </div>
            <textarea
              className="field min-h-[24rem] font-mono text-sm leading-6"
              name="planMarkdown"
              defaultValue={session.planMarkdown}
              placeholder={defaultPlanMarkdown}
            />
            <button className="button button-primary" type="submit">
              保存执行文档
            </button>
          </form>
          <article className="panel p-5">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">文档预览</h2>
            <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderedPlan }} />
          </article>
        </div>
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
