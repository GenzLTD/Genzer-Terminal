import contract from "@/contracts/payment.v1.json";

export type BillingRegion = "CN" | "US";

type RegionCode = BillingRegion;

type PlanEntry = {
  tier: string;
  name: Record<RegionCode, string>;
  prices: Record<RegionCode, { plan_id: string; amount: number; currency: string }>;
  features: Record<RegionCode, string[]>;
};

const DEPLOY_ALIASES: Record<string, BillingRegion> = { SG: "US", US: "US" };

export function normalizeRegion(region: string | null | undefined): BillingRegion {
  if (!region) return "CN";
  const code = region.trim().toUpperCase();
  if (code === "CN" || code === "US") return code;
  return DEPLOY_ALIASES[code] ?? "CN";
}

/** 与海外收银同一口径：中文浏览器按中国区，其余按美元区。 */
export function regionFromAcceptLanguage(header: string | null | undefined): BillingRegion {
  if (!header) return "CN";
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("zh")) return "CN";
  return "US";
}

export function canonicalTier(tier: string | null | undefined): string {
  if (!tier) return "free";
  const aliases = contract.deprecated_tier_aliases as Record<string, string>;
  return aliases[tier] ?? tier;
}

export type DisplayPlan = {
  tier: string;
  name: string;
  amount: number;
  currency: string;
  planId: string;
  features: string[];
  priceLabel: string;
  period: string;
};

export function formatAmount(amount: number, currency: string): string {
  if (currency === "CNY") return `¥${amount}`;
  if (currency === "USD") return amount === 0 ? "$0" : `$${amount.toFixed(2)}`;
  return `${amount} ${currency}`;
}

export function plansForRegion(region: BillingRegion): DisplayPlan[] {
  return (contract.plans as PlanEntry[]).map((entry) => {
    const price = entry.prices[region];
    return {
      tier: entry.tier,
      name: entry.name[region],
      amount: price.amount,
      currency: price.currency,
      planId: price.plan_id,
      features: entry.features[region],
      priceLabel: formatAmount(price.amount, price.currency),
      period: "/月",
    };
  });
}

export function regionLabel(region: BillingRegion): string {
  return contract.regions[region].label;
}

export function regionProvider(region: BillingRegion): string {
  return contract.regions[region].payment_provider;
}

export function enterpriseName(region: BillingRegion): string {
  return contract.enterprise.name[region];
}

export const BILLING_REGIONS: BillingRegion[] = ["CN", "US"];
