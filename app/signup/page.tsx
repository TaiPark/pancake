import Image from "next/image";
import { AuthForm } from "@/components/AuthForm";
import { BorderGlow } from "@/components/react-bits/BorderGlow";
import { APP_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="relative z-10 grid min-h-[100dvh] place-items-center px-4 py-8 md:px-8">
      <section className="w-full max-w-[1120px]">
        <BorderGlow
          animated
          className="reveal"
          backgroundColor="#101218"
          colors={["#73e6c7", "#f2d18b", "#89a8ff"]}
          fillOpacity={0.22}
          glowColor="166 68 68"
          glowIntensity={0.58}
        >
          <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
            <div className="grid content-start gap-8">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">{APP_NAME}</p>
                <h2 className="mt-5 max-w-[10ch] text-[2.5rem] font-semibold leading-[1.02] tracking-tight md:text-6xl">
                  给每次拍摄一个房间。
                </h2>
                <p className="mt-6 max-w-[34ch] leading-7 text-[var(--muted)]">
                  使用邀请码进入内测，把拍摄前、中、后的所有协作留在一个工作台。
                </p>
              </div>
              <div className="auth-proof-card">
                <Image
                  alt="摄影团队在拍摄现场检查画面"
                  className="object-cover opacity-75 saturate-[0.9]"
                  fill
                  sizes="(min-width: 1024px) 34vw, 100vw"
                  src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08090b] via-[#08090b]/12 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-2 p-3">
                  <div className="studio-metric">
                    <strong>小组</strong>
                    <span>邀请码加入</span>
                  </div>
                  <div className="studio-metric">
                    <strong>计划</strong>
                    <span>按拍摄推进</span>
                  </div>
                  <div className="studio-metric">
                    <strong>作品</strong>
                    <span>集中复盘</span>
                  </div>
                </div>
              </div>
            </div>
            <AuthForm mode="signup" />
          </div>
        </BorderGlow>
      </section>
    </main>
  );
}
