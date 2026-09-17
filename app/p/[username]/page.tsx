import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfileWithData } from "./profile-with-data";

interface PageProps {
  params: Promise<{ username: string }>;
}

// 动态生成 OG metadata，让微信/社交平台抓取到分享卡片
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const param = decodeURIComponent(username);
  const supabase = await createClient();

  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = UUID_REGEX.test(param);

  const { data: profile } = isUuid
    ? await supabase.from("profiles").select("username, layer0").eq("id", param).single()
    : await supabase.from("profiles").select("username, layer0").eq("username", param).single();

  if (!profile) {
    return { title: "用户不存在 | Genzer Terminal" };
  }

  const layer0 = (profile.layer0 as Record<string, unknown>) ?? {};
  const name = (layer0.name as string) ?? profile.username ?? "匿名用户";
  const mbtiType = (layer0.mbti_type as string) ?? "";
  const city = (layer0.city as string) ?? "";
  const manifesto = (layer0.manifesto as string) ?? "";
  const valueTags = ((layer0.value_tags as string[]) ?? []).slice(0, 5);
  const interestTags = ((layer0.interest_tags as string[]) ?? []).slice(0, 4);
  const shortManifesto = manifesto.length > 60 ? manifesto.slice(0, 57) + "..." : manifesto;

  // 构建 OG Image URL
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const ogImageUrl = `${baseUrl}/api/og/card?username=${encodeURIComponent(profile.username ?? param)}&name=${encodeURIComponent(name)}&mbti=${encodeURIComponent(mbtiType)}&city=${encodeURIComponent(city)}&manifesto=${encodeURIComponent(shortManifesto)}&values=${encodeURIComponent(valueTags.join(","))}&interests=${encodeURIComponent(interestTags.join(","))}`;

  const title = mbtiType
    ? `${name} · ${mbtiType} | Genzer Terminal 共识网络`
    : `${name} | Genzer Terminal 共识网络`;
  const description = mbtiType
    ? `${name} 是 ${mbtiType} 型人格${city ? "，来自" + city : ""}。在 Genzer Terminal 找到你的共识圈。`
    : `${name} 在 Genzer Terminal 的个人名片。共识网络自治节点。`;


  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/p/${profile.username ?? param}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${name} 的 MBTI 名片`,
        },
      ],
      type: "profile",
      siteName: "Genzer Terminal",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function ProfileRoute({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">加载中...</p>
        </div>
      }
    >
      <ProfileWithData params={params} />
    </Suspense>
  );
}
