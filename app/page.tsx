import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, CheckCircle, ImagesSquare, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { APP_NAME, APP_SLOGAN } from "@/lib/brand";
import { BorderGlow } from "@/components/react-bits/BorderGlow";

const workflow = [
  {
    title: "拍摄前",
    body: "把主题、分镜、服装和场地准备放进一张可执行清单。"
  },
  {
    title: "拍摄中",
    body: "现场变更、补拍提醒和素材备注同步给每个协作者。"
  },
  {
    title: "拍摄后",
    body: "选片、反馈和交付记录留在同一个项目上下文里。"
  }
];

const proof = ["群组协作", "拍摄流程", "作品交付"];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user?.id);

  return (
    <main className="relative z-10 min-h-[100dvh] px-4 py-5 md:px-8">
      <header className="mx-auto flex h-16 max-w-[1440px] items-center justify-between">
        <Link href="/" className="flex min-w-0 items-baseline gap-3">
          <span className="text-xl font-semibold tracking-tight">{APP_NAME}</span>
          <span className="hidden truncate text-sm text-[var(--muted)] sm:inline">{APP_SLOGAN}</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link className="button button-secondary min-h-10 px-3" href={isSignedIn ? "/app/groups" : "/login"}>
            {isSignedIn ? "进入" : "登录"}
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100dvh-5.25rem)] max-w-[1440px] items-center py-5 md:py-6">
        <BorderGlow
          animated
          className="reveal"
          backgroundColor="#101218"
          colors={["#73e6c7", "#f2d18b", "#89a8ff"]}
          glowColor="166 68 68"
          glowIntensity={0.64}
          fillOpacity={0.28}
        >
          <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:p-8">
            <div className="flex flex-col justify-between gap-8 lg:min-h-[25rem]">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  Photo workflow
                </p>
                <h1 className="mt-5 max-w-[10ch] text-[2.55rem] font-semibold leading-[0.98] tracking-tight sm:text-5xl md:text-6xl lg:text-[4.5rem]">
                  拍摄协作归位。
                </h1>
                <p className="mt-5 max-w-[34rem] text-base leading-7 text-[var(--muted)] md:text-lg">
                  把拍摄主题、现场记录和交付反馈放在同一块板上，团队不用再翻聊天记录。
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link className="button button-primary min-h-12 px-5" href={isSignedIn ? "/app/groups" : "/login"}>
                    {isSignedIn ? "进入工作台" : "登录"}
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                  {!isSignedIn ? (
                    <Link className="button button-secondary min-h-12 px-5" href="/signup">
                      创建账号
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1.25fr_0.85fr_0.9fr]">
                {workflow.map((item, index) => (
                  <article
                    className={`rounded-[8px] border border-white/10 bg-white/[0.045] p-4 ${
                      index === 0 ? "md:min-h-32" : "md:min-h-28"
                    }`}
                    key={item.title}
                  >
                    <h2 className="text-lg font-semibold tracking-tight">{item.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-rows-[1fr_auto]">
              <div className="relative min-h-[22rem] overflow-hidden rounded-[8px] border border-white/10 bg-[var(--surface-soft)] lg:min-h-[20rem]">
                <Image
                  alt="摄影团队在拍摄现场检查画面"
                  className="object-cover opacity-[0.76] saturate-[0.92]"
                  fill
                  priority
                  sizes="(min-width: 1024px) 44vw, 100vw"
                  src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1100&q=82"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08090b] via-[#08090b]/12 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 grid gap-3 p-3 md:grid-cols-3">
                  {proof.map((item) => (
                    <div className="rounded-[8px] border border-white/10 bg-[#08090b]/70 p-3 backdrop-blur-md" key={item}>
                      <CheckCircle className="text-[var(--accent-strong)]" size={18} weight="fill" />
                      <p className="mt-3 text-sm font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr]">
                <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
                  <Camera className="text-[var(--accent-strong)]" size={22} />
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">每场拍摄都有明确的准备、现场和复盘阶段。</p>
                </div>
                <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
                  <UsersThree className="text-[var(--accent-strong)]" size={22} />
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">组员、摄影、后期和模特看到同一份进度。</p>
                </div>
                <div className="rounded-[8px] border border-white/10 bg-[rgb(115_230_199_/_0.08)] p-3">
                  <ImagesSquare className="text-[var(--accent-strong)]" size={22} />
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">素材、笔记和反馈不再被聊天消息冲走。</p>
                </div>
              </div>
            </div>
          </div>
        </BorderGlow>
      </section>
    </main>
  );
}
