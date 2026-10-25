"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXTERNAL_LINK_PROPS, GENZ_LINKS } from "@/lib/genz-links";
import {
  BILLING_REGIONS,
  type BillingRegion,
  canonicalTier,
  enterpriseName,
  plansForRegion,
  regionLabel,
  regionProvider,
} from "@/lib/payment-plans";

interface PricingPageContentProps {
  currentTier: string;
  isLoggedIn: boolean;
  initialRegion: BillingRegion;
}

export function PricingPageContent({
  currentTier,
  isLoggedIn,
  initialRegion,
}: PricingPageContentProps) {
  const [region, setRegion] = useState<BillingRegion>(initialRegion);
  const plans = plansForRegion(region);
  const activeTier = canonicalTier(currentTier);
  const provider = regionProvider(region);

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">选择档位</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          档位全球统一，价格按地区分叉。下面的金额来自支付契约，切换地区后币种和价格一起变。
        </p>
        <div className="mt-6 inline-flex rounded-lg border p-1">
          {BILLING_REGIONS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setRegion(code)}
              className={`px-4 py-2 text-sm rounded-md transition ${
                region === code
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {regionLabel(code)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          当前结算：{regionLabel(region)} · {provider}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.tier === activeTier;
          const highlighted = plan.tier === "supporter";
          return (
            <Card
              key={plan.tier}
              className={`relative flex flex-col ${
                highlighted ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" : ""
              } ${isCurrent ? "opacity-75" : ""}`}
            >
              {highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    推荐
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.planId}</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">{plan.priceLabel}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button className="w-full" disabled>
                    当前档位
                  </Button>
                ) : plan.tier === "free" ? (
                  <Link href={isLoggedIn ? "/protected" : "/auth/sign-up"} className="w-full">
                    <Button variant="outline" className="w-full">
                      {isLoggedIn ? "返回首页" : "免费加入"}
                    </Button>
                  </Link>
                ) : (
                  <a
                    className="w-full"
                    href={`${GENZ_LINKS.tspace}/pricing?region=${region}&tier=${plan.tier}`}
                    {...EXTERNAL_LINK_PROPS}
                  >
                    <Button className="w-full gap-1">
                      去收银台
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        {enterpriseName(region)}需联系销售，不在这张月费表里。
      </p>
    </div>
  );
}
