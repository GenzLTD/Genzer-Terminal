import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PricingPageContent } from "@/components/pricing/pricing-page";
import {
  normalizeRegion,
  regionFromAcceptLanguage,
  type BillingRegion,
} from "@/lib/payment-plans";
import { hasEnvVars } from "@/lib/utils";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  // 未登录也可以看定价页；本机没配 Supabase 时按未登录渲染
  let tier = "free";
  let user: { id: string } | null = null;
  if (hasEnvVars) {
    const supabase = await createClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    user = sessionUser;
    if (user) {
      const { data } = await supabase
        .from("user_tiers")
        .select("tier")
        .eq("user_id", user.id)
        .single();
      if (data?.tier) tier = data.tier;
    }
  }

  // 地区优先取链接上带的 ?region=（裂变落地页会带上），没有再退回浏览器语言。
  // 注意 normalizeRegion 对空值会返回 CN，所以必须先判断"有没有传"，不能直接喂给它。
  const headerList = await headers();
  const requested = (await searchParams)?.region;
  const initialRegion: BillingRegion = requested
    ? normalizeRegion(requested)
    : regionFromAcceptLanguage(headerList.get("accept-language"));

  return (
    <PricingPageContent
      currentTier={tier}
      isLoggedIn={!!user}
      initialRegion={initialRegion}
    />
  );
}
