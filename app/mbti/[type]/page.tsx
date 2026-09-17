import { MBTI_DATA, MBTI_GROUPS } from "@/lib/mbti-data";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ type: string }>;
}

// 生成静态路径 —— 16 种类型
export function generateStaticParams() {
  return Object.keys(MBTI_DATA).map((type) => ({ type: type.toLowerCase() }));
}

// 动态 SEO metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type } = await params;
  const key = type.toUpperCase();
  const data = MBTI_DATA[key];
  if (!data) return { title: "MBTI 类型不存在" };

  const title = `${key} ${data.name} (${data.nickname}) | Genzer Terminal 共识网络`;
  const description = `${data.description.slice(0, 120)}...在 Genzer Terminal 找到与你价值观匹配的同道中人。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Genzer Terminal",
    },
    keywords: [
      key,
      data.name,
      data.nickname,
      "MBTI",
      "性格测试",
      "共识社区",
      "社交网络",
      ...data.traits,
    ],
  };
}

export default async function MBTITypePage({ params }: PageProps) {
  const { type } = await params;
  const key = type.toUpperCase();
  const data = MBTI_DATA[key];
  if (!data) notFound();

  // 找到所属分组
  const group = Object.entries(MBTI_GROUPS).find(([, g]) =>
    g.types.includes(key)
  );

  // 同组其他类型
  const sameGroupTypes = group
    ? group[1].types.filter((t) => t !== key)
    : [];

  // 匹配类型数据
  const matchTypes = data.matches
    .map((m) => MBTI_DATA[m])
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${data.color}10 0%, ${data.color}05 100%)`,
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* MBTI 大字 */}
            <div
              className="text-8xl sm:text-9xl font-black tracking-tighter"
              style={{ color: data.color }}
            >
              {key}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                {data.name}
                <span className="text-muted-foreground text-lg font-normal ml-3">
                  {data.nickname}
                </span>
              </h1>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                {data.traits.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      background: `${data.color}15`,
                      color: data.color,
                      border: `1px solid ${data.color}30`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {group && (
                <p className="text-sm text-muted-foreground mt-3">
                  属于
                  <span
                    className="font-medium ml-1"
                    style={{ color: group[1].color }}
                  >
                    {group[1].name}
                  </span>
                  组
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 详细描述 */}
      <section className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h2 className="text-xl font-semibold mb-3">关于 {data.name}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {data.description}
          </p>
        </div>

        {/* 核心优势 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">核心优势</h2>
          <p className="text-base text-muted-foreground">{data.strengths}</p>
        </div>

        {/* 适合职业 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">典型职业方向</h2>
          <div className="flex flex-wrap gap-2">
            {data.careers.split("、").map((c) => (
              <span
                key={c}
                className="px-3 py-1.5 rounded-lg bg-secondary text-sm"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* 最佳匹配 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">共识匹配度最高</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {matchTypes.map((m) => {
              const matchKey = data.matches[matchTypes.indexOf(m)];
              return (
                <Link
                  key={matchKey}
                  href={`/mbti/${matchKey.toLowerCase()}`}
                  className="flex items-center gap-4 p-4 rounded-xl border hover:shadow-md transition-shadow"
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: m.color }}
                  >
                    {matchKey}
                  </div>
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {m.nickname}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 同组类型 */}
        {sameGroupTypes.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-3">
              同为{group?.[1].name}
            </h2>
            <div className="flex flex-wrap gap-3">
              {sameGroupTypes.map((t) => {
                const td = MBTI_DATA[t];
                return (
                  <Link
                    key={t}
                    href={`/mbti/${t.toLowerCase()}`}
                    className="px-4 py-2 rounded-lg border hover:shadow-sm transition-shadow"
                    style={{
                      borderColor: `${td.color}40`,
                      color: td.color,
                    }}
                  >
                    <span className="font-bold">{t}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {td.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center py-8 border-t">
          <h2 className="text-2xl font-bold mb-3">
            你是 {key} 吗？
          </h2>
          <p className="text-muted-foreground mb-6">
            加入 Genzer Terminal，找到与你价值观共鸣的同道中人
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" style={{ background: data.color }}>
                创建我的 MBTI 名片
              </Button>
            </Link>
            <Link href={`/mbti`}>
              <Button variant="outline" size="lg">
                查看全部 16 种类型
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
