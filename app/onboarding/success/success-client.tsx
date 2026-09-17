"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Scale,
  ArrowRight,
  Users,
  Shield,
  Vote,
  Award,
} from "lucide-react";
import Link from "next/link";

interface SuccessPageClientProps {
  name: string;
}

export function SuccessPageClient({ name }: SuccessPageClientProps) {
  const tathaUrl =
    process.env.NEXT_PUBLIC_TATHA_URL || "http://127.0.0.1:8010";

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      {/* 成功提示 */}
      <div className="text-center mb-8">
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          {name}，你的名片已创建！
        </h1>
        <p className="text-muted-foreground">
          你现在已经是社区的<strong>参与者</strong>了
        </p>
      </div>

      {/* 参与者身份说明 */}
      <div className="mb-6 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium">你现在的身份：社区成员</span>
        </div>
        <p className="text-sm text-muted-foreground">
          你可以创建名片、发现同道、关注互动——社区的大门已为你打开。
        </p>
      </div>

      {/* 两个选择 */}
      <div className="space-y-4">
        {/* 立即体验 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Users className="w-8 h-8 text-primary shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">去发现同道</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  基于价值观和兴趣共识，找到和你志同道合的人
                </p>
                <Link href="/discover">
                  <Button variant="outline" className="gap-1">
                    去发现
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 升级为治理参与者 */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Scale className="w-8 h-8 text-primary shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">
                  升级为治理参与者
                  <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Tatha
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  不仅参与社区，更能<strong className="text-primary">影响社区</strong>——发起提案、参与投票、获得链上声誉和
                  SBT 勋章
                </p>
                {/* 治理权三要素 */}
                <div className="flex gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <Shield className="w-3.5 h-3.5" />
                    <span>链上声誉</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <Vote className="w-3.5 h-3.5" />
                    <span>加权投票</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <Award className="w-3.5 h-3.5" />
                    <span>SBT 勋章</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/pricing">
                    <Button size="sm" className="gap-1">
                      了解治理权限
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(tathaUrl, "_blank")}
                  >
                    体验演示 →
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部提示 */}
      <p className="text-center text-xs text-muted-foreground mt-8">
        同一账号可在 Genzer Terminal 和 Tatha 之间无缝切换 ·
        免费版配额充足，不构成使用障碍
      </p>
    </div>
  );
}
