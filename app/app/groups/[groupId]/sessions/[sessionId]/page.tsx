import Link from "next/link";
import { notFound } from "next/navigation";
import { updatePlanAction, updateSparkAction } from "@/app/actions";
import { PhotoMasonry } from "@/components/PhotoMasonry";
import { PhotoUploader } from "@/components/PhotoUploader";
import { StageControls } from "@/components/StageControls";
import { auth } from "@/lib/auth";
import { parseSparkFields } from "@/lib/domain";
import { renderMarkdown } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";
import { publicPhotoUrl } from "@/lib/storage";

export default async function SessionPage({
  params
}: {
  params: Promise<{ groupId: string; sessionId: string }>;
}) {
  const authSession = await auth();
  const { groupId, sessionId } = await params;
  const session = await prisma.session.findFirst({
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
  });

  if (!session) {
    notFound();
  }

  const spark = parseSparkFields(session.sparkFields);
  const renderedPlan = await renderMarkdown(session.planMarkdown || "### 还没有摄影策划\n\n在左侧写下拍摄目标、分镜、灯光、服装和现场执行。");

  return (
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
            <p className="mt-5 text-sm text-[var(--muted)]">
              最后更新：{session.updatedBy?.name ?? "未知成员"}，{session.updatedAt.toLocaleString("zh-CN")}
            </p>
          </div>
          <StageControls sessionId={session.id} stage={session.stage} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <form action={updateSparkAction.bind(null, session.id)} className="panel grid gap-4 p-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">思维火花</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">群组成员都可以改，保存后成为下一版。</p>
          </div>
          <label className="grid gap-2 text-sm">
            摄影主题
            <input className="field" name="theme" defaultValue={spark.theme} placeholder="例如：雨后便利店人像" />
          </label>
          <label className="grid gap-2 text-sm">
            情绪与质感
            <input className="field" name="mood" defaultValue={spark.mood} placeholder="潮湿、霓虹、低饱和、胶片颗粒" />
          </label>
          <label className="grid gap-2 text-sm">
            参考
            <textarea className="field min-h-28" name="references" defaultValue={spark.references} />
          </label>
          <label className="grid gap-2 text-sm">
            还没定型的想法
            <textarea className="field min-h-36" name="notes" defaultValue={spark.notes} />
          </label>
          <button className="button button-primary" type="submit">
            保存火花
          </button>
        </form>

        <div className="grid gap-4">
          <form action={updatePlanAction.bind(null, session.id)} className="panel grid gap-4 p-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Markdown 策划</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">写成能带到现场执行的版本。</p>
            </div>
            <textarea
              className="field min-h-[24rem] font-mono text-sm leading-6"
              name="planMarkdown"
              defaultValue={session.planMarkdown}
              placeholder={"## 拍摄目标\n\n## 分镜\n\n## 灯光\n\n## 服装与道具\n\n## 现场顺序"}
            />
            <button className="button button-primary" type="submit">
              保存策划
            </button>
          </form>
          <article className="panel p-5">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">策划预览</h2>
            <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderedPlan }} />
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <PhotoUploader sessionId={session.id} />
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
  );
}
