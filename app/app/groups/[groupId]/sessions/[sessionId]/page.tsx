import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updatePlanAction, updateSparkAction } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { PhotoMasonry } from "@/components/PhotoMasonry";
import { PhotoUploader } from "@/components/PhotoUploader";
import { StageControls } from "@/components/StageControls";
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
  const [currentUser, session] = await Promise.all([
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
        <Link className="text-sm text-[var(--muted)] hover:text-[var(--text)]" href={`/app/groups/${groupId}`}>
          返回 {session.group.name}
        </Link>
        <div className="grid gap-4 xl:grid-cols-[1fr_28rem] xl:items-end">
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
          <StageControls sessionId={session.id} stage={session.stage} />
        </div>
      </section>

      <section className="workflow-rail grid gap-3 md:grid-cols-3">
        {workflowSections.map((section, index) => {
          const filled = section.fields.filter((field) => spark[field.name].trim().length > 0).length;
          return (
            <article
              className={`workflow-card panel reveal p-4 ${section.stage === session.stage ? "workflow-card-active" : ""}`}
              key={section.stage}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-[var(--accent-strong)]">0{index + 1}</span>
                <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-[var(--muted)]">
                  {filled}/{section.fields.length}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{section.summary}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <form action={updateSparkAction.bind(null, session.id)} className="grid gap-4">
          {workflowSections.map((section, index) => (
            <section
              className={`panel reveal grid gap-4 p-5 ${section.stage === session.stage ? "workflow-section-active" : ""}`}
              key={section.stage}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div>
                <p className="font-mono text-xs text-[var(--accent-strong)]">{stageLabel(section.stage)}</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">{section.title}工作流</h2>
                <p className="mt-2 max-w-[68ch] text-sm leading-6 text-[var(--muted)]">{section.summary}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {section.fields.map((field) => (
                  <label className={`grid gap-2 text-sm ${field.multiline ? "md:col-span-2" : ""}`} key={field.name}>
                    {field.label}
                    {field.multiline ? (
                      <textarea
                        className="field min-h-28"
                        name={field.name}
                        defaultValue={spark[field.name]}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input className="field" name={field.name} defaultValue={spark[field.name]} placeholder={field.placeholder} />
                    )}
                  </label>
                ))}
              </div>
            </section>
          ))}
          <button className="button button-primary justify-self-start" type="submit">
            保存拍摄流程
          </button>
        </form>

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
