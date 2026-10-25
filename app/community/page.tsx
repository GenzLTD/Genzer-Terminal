import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  EXTERNAL_LINK_PROPS,
  GENZ_CIRCLE_URL,
  GENZ_LINKS,
} from "@/lib/genz-links";
import Link from "next/link";
import { Suspense } from "react";

const STATEMENTS = [
  {
    title: "身份主权",
    body: "Layer 0 到 Layer 2 逐层开放，可以撤回。",
  },
  {
    title: "共识匹配",
    body: "按价值观标签算 Jaccard 相似度，找同频的人。",
  },
  {
    title: "邀请制生长",
    body: "注册要老成员的邀请码。",
  },
];

export default function CommunityGuidePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-5xl flex justify-between items-center px-5 text-sm">
          <Link href="/" className="font-semibold">
            Genzer
          </Link>
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      <article className="flex-1 w-full max-w-3xl mx-auto px-5 py-16 flex flex-col gap-12">
        <header className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">社区说明书</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            这个社区是什么
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            这一页公开可看。同道的名字和标签只在登录后的名录里。
          </p>
        </header>

        <section className="grid gap-8">
          {STATEMENTS.map((item) => (
            <div key={item.title} className="flex flex-col gap-2 border-t border-foreground/10 pt-6">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4 border-t border-foreground/10 pt-8">
          <h2 className="text-lg font-semibold">从这里进去</h2>
          <div className="flex flex-col gap-3">
            <Link
              href="/auth/sign-up"
              className="border border-foreground/20 rounded-lg px-5 py-4 hover:bg-foreground/5 transition"
            >
              <span className="font-medium">邀请码注册</span>
              <span className="block text-sm text-muted-foreground mt-1">
                还没有账号，用老成员给你的邀请码注册。
              </span>
            </Link>
            <Link
              href="/discover"
              className="border border-foreground/20 rounded-lg px-5 py-4 hover:bg-foreground/5 transition"
            >
              <span className="font-medium">同道名录</span>
              <span className="block text-sm text-muted-foreground mt-1">
                登录后按价值观看同道。没登录会先到登录页。
              </span>
            </Link>
            <a
              href={GENZ_CIRCLE_URL}
              className="border border-foreground/20 rounded-lg px-5 py-4 hover:bg-foreground/5 transition"
              {...EXTERNAL_LINK_PROPS}
            >
              <span className="font-medium">进入共识圈</span>
              <span className="block text-sm text-muted-foreground mt-1">
                另一处围坐，和名录分开进入。
              </span>
            </a>
          </div>
        </section>
      </article>

      <footer className="w-full flex flex-wrap items-center justify-center border-t border-foreground/10 text-xs gap-6 py-12 px-5">
        <Link href="/" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
          返回首页
        </Link>
        <a
          href={`${GENZ_LINKS.web}/legal/privacy`}
          className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
        >
          隐私政策
        </a>
        <ThemeSwitcher />
      </footer>
    </main>
  );
}
