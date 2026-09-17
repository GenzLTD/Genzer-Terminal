"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  Users,
  Scale,
  Crown,
  ArrowRight,
  Shield,
  Vote,
  Award,
  Sparkles,
  Brain,
} from "lucide-react";
import Link from "next/link";

interface PricingPageContentProps {
  currentTier: string;
  isLoggedIn: boolean;
}

const tiers = [
  {
    id: "free",
    name: "社区成员",
    subtitle: "Genzer Terminal 共识网络",
    price: "¥0",
    period: "永久免费",
    description: "创建你的共识名片，发现志同道合的人",
    icon: Users,
    category: "参与权",
    features: [
      "创建 Layer0 个人名片",
      "价值观 + 兴趣标签选择",
      "MBTI 人格自报",
      "共识匹配与发现同道",
      "关注与互动",
      "邀请好友加入",
      "查看治理提案（只读）",
    ],
    limitations: [
      "无法发起治理提案",
      "无法参与治理投票",
      "无链上声誉记录",
      "无 SBT 勋章体系",
    ],
    cta: "当前方案",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
  {
    id: "basic",
    name: "治理参与者",
    subtitle: "社区自治 + AI 能力",
    price: "¥99",
    period: "/月",
    description: "不仅参与社区，更能影响社区——发起提案、参与投票、获得链上声誉",
    icon: Scale,
    category: "治理权",
    features: [
      "✓ 社区成员全部权益",
      "发起治理提案（每日 3 个）",
      "参与治理投票（每日 20 票）",
      "投票权重 = 声誉×60% + 贡献×40%",
      "链上声誉记录（不可篡改）",
      "SBT 灵魂绑定勋章",
      "AI 求职匹配（每日 20 次）",
      "简历上传与解析（每日 5 份）",
    ],
    limitations: [],
    cta: "成为治理参与者",
    ctaVariant: "default" as const,
    highlighted: true,
  },
  {
    id: "pro",
    name: "社区共建者",
    subtitle: "深度治理 + 全能力",
    price: "¥299",
    period: "/月",
    description: "深度参与社区建设，拥有最高治理权重，解锁全部 AI 能力",
    icon: Crown,
    category: "共建权",
    features: [
      "✓ 治理参与者全部权益",
      "不限治理提案数量",
      "不限投票次数",
      "提案自动执行（智能治理引擎）",
      "金质贡献者勋章",
      "API 接入权限",
      "无限 AI 求职匹配",
      "无限简历解析与 AI 问答",
    ],
    limitations: [],
    cta: "成为社区共建者",
    ctaVariant: "default" as const,
    highlighted: false,
  },
];

/** 核心差异化对比展示 */
function CoreDifferentiator() {
  return (
    <div className="max-w-3xl mx-auto mb-12 p-6 rounded-xl border bg-muted/30">
      <h2 className="text-lg font-semibold text-center mb-4">
        免费版 vs 付费版的本质差别
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-5 h-5" />
            <span className="font-medium">社区成员（免费）</span>
          </div>
          <p className="text-sm text-muted-foreground">
            你是社区的<strong>参与者</strong>——创建名片、发现同道、关注互动。
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>你的声量：</span>
            <span className="text-muted-foreground">可查看，但无法影响</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Vote className="w-5 h-5" />
            <span className="font-medium">治理参与者（付费）</span>
          </div>
          <p className="text-sm">
            你是社区的<strong className="text-primary">共建者</strong>——发起提案、参与投票、获得链上声誉。
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span>你的声量：</span>
            <span className="text-primary font-medium">
              可以影响社区的方向
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 三大核心价值展示 */
function CoreValues() {
  const values = [
    {
      icon: Shield,
      title: "链上声誉",
      description:
        "你的每一次贡献都被永久记录，不可篡改、不可转让。不是看谁有钱，而是看谁贡献多。",
    },
    {
      icon: Vote,
      title: "加权治理",
      description:
        "投票权重 = 声誉分×60% + 贡献积分×40%。贡献越多，话语权越大，不是持币即有权。",
    },
    {
      icon: Award,
      title: "SBT 勋章",
      description:
        "灵魂绑定勋章（不可转让）证明你的真实贡献。等级与声誉挂钩，自动升级。",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto mb-12">
      <h2 className="text-xl font-semibold text-center mb-6">
        付费版的核心不是"更多配额"，而是"治理参与权"
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {values.map((v) => {
          const Icon = v.icon;
          return (
            <div
              key={v.title}
              className="text-center p-4 rounded-lg border bg-card"
            >
              <Icon className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-medium mb-2">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PricingPageContent({
  currentTier,
  isLoggedIn,
}: PricingPageContentProps) {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">从参与走向共建</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          免费版是社区的大门——发现同道、建立连接。付费版是社区的方向盘——发起提案、参与投票、塑造未来。
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 text-sm">
          <span className="text-muted-foreground">Genzer Terminal</span>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-primary" />
            Tatha 治理层
          </span>
        </div>
      </div>

      {/* 核心差异化说明 */}
      <CoreDifferentiator />

      {/* 三大核心价值 */}
      <CoreValues />

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const isCurrent = tier.id === currentTier;
          const Icon = tier.icon;

          return (
            <Card
              key={tier.id}
              className={`relative flex flex-col ${
                tier.highlighted
                  ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                  : ""
              } ${isCurrent ? "opacity-75" : ""}`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    推荐
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {tier.subtitle}
                </p>
                <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {tier.category}
                </span>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Price */}
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>

                {/* Description */}
                <p className="text-center text-sm text-muted-foreground mb-4">
                  {tier.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {tier.limitations.map((l, i) => (
                    <li
                      key={`lim-${i}`}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="w-4 h-4 mt-0.5 shrink-0 text-center text-xs">
                        —
                      </span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <Button variant={tier.ctaVariant} className="w-full" disabled>
                    {tier.cta}
                  </Button>
                ) : tier.id === "free" ? (
                  <Link
                    href={isLoggedIn ? "/protected" : "/auth/sign-up"}
                    className="w-full"
                  >
                    <Button variant={tier.ctaVariant} className="w-full">
                      {isLoggedIn ? "返回首页" : "免费加入社区"}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant={tier.ctaVariant}
                    className="w-full gap-1"
                    onClick={() => {
                      const tathaUrl =
                        process.env.NEXT_PUBLIC_TATHA_URL ||
                        "http://127.0.0.1:8010";
                      window.open(
                        `${tathaUrl}/?tier=${tier.id}`,
                        "_blank"
                      );
                    }}
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-center mb-6">常见问题</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">
              免费版和付费版的核心差别是什么？
            </h3>
            <p className="text-sm text-muted-foreground">
              不是配额限制，而是<strong>治理参与权</strong>。免费版可以充分使用发现同道、创建名片等社交功能；付费版在此基础上获得链上声誉、SBT
              勋章、提案和投票等社区治理能力。
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">什么是"治理权重"？</h3>
            <p className="text-sm text-muted-foreground">
              治理权重决定你的投票分量。计算公式：声誉分×60% +
              贡献积分×40%。这意味着贡献越多的人，在社区决策中话语权越大——而不是看谁钱多。
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">什么是 SBT 灵魂绑定勋章？</h3>
            <p className="text-sm text-muted-foreground">
              SBT（Soulbound Token）是不可转让的链上勋章，代表你的真实贡献。不同于普通
              NFT 可以买卖，SBT
              永远绑定在你的身份上，证明你真正做过什么。等级与声誉值挂钩，自动升级。
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">
              免费版的配额够用吗？
            </h3>
            <p className="text-sm text-muted-foreground">
              配额仅用于防刷保护，不构成使用障碍。免费版每天可以浏览 50
              个同道、查看 100
              个资料，对正常使用完全够用。如果你需要治理参与权或 AI
              能力，那才是付费的理由。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
