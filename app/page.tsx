import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  EXTERNAL_LINK_PROPS,
  GENZ_BUSINESS_LINKS,
  GENZ_CIRCLE_URL,
  GENZ_LINKS,
} from "@/lib/genz-links";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-5xl flex justify-between items-center px-5 text-sm">
          <div className="flex gap-5 items-center font-semibold">
            <Link href={"/"}>Genzer</Link>
          </div>
          {/* 新加坡业务入口：终端是独立产品（Vercel+Supabase），
              收银/共识圈在 SG，跨站新窗口打开，不打断登录态 */}
          <div className="hidden md:flex gap-5 items-center text-muted-foreground">
            {GENZ_BUSINESS_LINKS.map((l) => (
              <a
                key={l.key}
                href={l.href}
                className="hover:text-foreground transition"
                {...(l.external ? EXTERNAL_LINK_PROPS : {})}
              >
                {l.label}
              </a>
            ))}
          </div>
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center gap-8 px-5 py-32 text-center">
        <div className="flex flex-col gap-4 items-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Genzer Terminal
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
            共识网络自治节点 — 身份 · 信号 · 信任
          </p>
        </div>

        <p className="max-w-lg text-muted-foreground leading-relaxed">
          Zervi-Genzer 共识网络的软件终端节点。通过信号协议与共识匹配，
          为 Ctrl4U 穿戴硬件提供身份与信任基础设施。
        </p>

        <div className="flex flex-wrap justify-center gap-4 mt-4">
          <Link
            href="/auth/sign-up"
            className="bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:opacity-90 transition"
          >
            邀请码注册
          </Link>
          <Link
            href="/discover"
            className="border border-foreground/20 px-6 py-3 rounded-lg font-medium hover:bg-foreground/5 transition"
          >
            探索社区
          </Link>
          <a
            href={GENZ_CIRCLE_URL}
            className="border border-foreground/20 px-6 py-3 rounded-lg font-medium hover:bg-foreground/5 transition"
            {...EXTERNAL_LINK_PROPS}
          >
            进入共识圈
          </a>
        </div>

        <p className="text-sm text-muted-foreground">
          本网络为邀请制：注册需要老成员的邀请码。暂无邀请码？{" "}
          <a
            href={GENZ_LINKS.web}
            className="underline underline-offset-4 hover:text-foreground"
          >
            访问 GenZ 了解生态与产品
          </a>
          ，或联系已有成员获取邀请。
        </p>
      </section>

      {/* Principles */}
      <section className="w-full border-t border-foreground/10 py-24 px-5">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-12">
          <div className="flex flex-col gap-3">
            <div className="text-3xl">🛡️</div>
            <h3 className="text-lg font-semibold">身份主权</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              你的身份数据由你掌控。Layer 0 到 Layer 2
              逐层开放，永远保持撤回权。
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-3xl">🤝</div>
            <h3 className="text-lg font-semibold">共识匹配</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              基于价值观标签的 Jaccard 相似度算法，找到真正同频的人。
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-3xl">🔒</div>
            <h3 className="text-lg font-semibold">邀请制生长</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              每个用户初始 5 个邀请码。有机生长，拒绝流量炒作。
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full flex flex-wrap items-center justify-center border-t border-foreground/10 mx-auto text-center text-xs gap-6 py-12 px-5">
        <p className="text-muted-foreground">Genzer Terminal · 共识网络自治节点</p>
        <p className="text-muted-foreground flex gap-4">
          <a
            href={GENZ_LINKS.web}
            className="hover:text-foreground hover:underline underline-offset-4"
          >
            GenZ PlanetX
          </a>
          <a
            href={GENZ_LINKS.tspace}
            className="hover:text-foreground hover:underline underline-offset-4"
            {...EXTERNAL_LINK_PROPS}
          >
            T空间
          </a>
          <a
            href={GENZ_CIRCLE_URL}
            className="hover:text-foreground hover:underline underline-offset-4"
            {...EXTERNAL_LINK_PROPS}
          >
            共识圈
          </a>
          <a
            href={`${GENZ_LINKS.web}/legal/privacy`}
            className="hover:text-foreground hover:underline underline-offset-4"
          >
            隐私政策
          </a>
          <a
            href={`${GENZ_LINKS.web}/legal/terms`}
            className="hover:text-foreground hover:underline underline-offset-4"
          >
            服务条款
          </a>
          <a
            href={`${GENZ_LINKS.web}/legal/refund`}
            className="hover:text-foreground hover:underline underline-offset-4"
          >
            退款政策
          </a>
        </p>
        <ThemeSwitcher />
      </footer>
    </main>
  );
}
