import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PricingPageContent } from "@/components/pricing/pricing-page";
import { regionFromAcceptLanguage } from "@/lib/payment-plans";
import { hasEnvVars } from "@/lib/utils";

export default async function PricingPage() {
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

  const headerList = await headers();
  const initialRegion = regionFromAcceptLanguage(headerList.get("accept-language"));

  return (
    <PricingPageContent
      currentTier={tier}
      isLoggedIn={!!user}
      initialRegion={initialRegion}
    />
  );
}
