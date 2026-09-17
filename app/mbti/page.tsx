import { MBTI_DATA, MBTI_GROUPS } from "@/lib/mbti-data";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "16 种 MBTI 人格类型 | Genzer Terminal 共识网络",
  description:
    "了解 MBTI 16 种人格类型的特质、优势和职业方向。在 Genzer Terminal 共识社区找到与你价值观匹配的同道中人。",
  keywords: [
    "MBTI",
    "人格类型",
    "性格测试",
    "16型人格",
    "共识社区",
    "社交网络",
  ],
};

export default function MBTIOverviewPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          16 种 MBTI 人格类型
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          MBTI 将人格分为四个维度，组合出 16 种独特类型。了解你的类型，
          找到与你价值观共鸣的社区。
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/auth/sign-up">
            <Button size="lg">测测你的共识圈</Button>
          </Link>
        </div>
      </section>

      {/* 四大分组 */}
      {Object.entries(MBTI_GROUPS).map(([, group]) => (
        <section key={group.name} className="max-w-5xl mx-auto px-6 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: group.color }}
            />
            <h2 className="text-2xl font-bold">{group.name}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {group.types.map((type) => {
              const data = MBTI_DATA[type];
              return (
                <Link
                  key={type}
                  href={`/mbti/${type.toLowerCase()}`}
                  className="group block p-6 rounded-xl border hover:shadow-lg transition-all"
                  style={{
                    borderColor: `${data.color}30`,
                  }}
                >
                  <div
                    className="text-3xl font-black mb-2"
                    style={{ color: data.color }}
                  >
                    {type}
                  </div>
                  <div className="font-semibold mb-1">{data.name}</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {data.nickname}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {data.traits.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-xs"
                        style={{
                          background: `${data.color}10`,
                          color: data.color,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {/* 底部 CTA */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center border-t">
        <h2 className="text-2xl font-bold mb-3">
          找到你的共识圈
        </h2>
          <p className="text-muted-foreground mb-6">
          在 Genzer Terminal，MBTI 不只是标签——它是共识匹配的起点。
        </p>
        <Link href="/auth/sign-up">
          <Button size="lg">免费创建 MBTI 名片</Button>
        </Link>
      </section>
    </div>
  );
}
