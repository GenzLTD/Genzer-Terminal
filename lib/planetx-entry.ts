import { GENZ_LINKS } from "@/lib/genz-links";
import type { BillingRegion } from "@/lib/payment-plans";

/**
 * 裂变落地只进 PlanetX。region 跟支付契约走；
 * ref / join 是 looma 的邀请码，不是终端 Supabase 的 invite。
 */
export function planetxEntryUrl(options: {
  region: BillingRegion;
  ref?: string | null;
  join?: string | null;
}): string {
  const url = new URL(GENZ_LINKS.planetx);
  url.searchParams.set("region", options.region);
  const ref = options.ref?.trim();
  const join = options.join?.trim();
  if (ref) url.searchParams.set("ref", ref);
  if (join) url.searchParams.set("join", join);
  return url.toString();
}
