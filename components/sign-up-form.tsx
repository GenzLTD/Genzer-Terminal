"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function SignUpFormInner({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [isSeedCode, setIsSeedCode] = useState(false); // ★ 是否是种子码
  // 邀请码由链接预填（?invite= 或裂变口径的 ?join=）；ref 只是归因来源，不是邀请码
  const [prefilled, setPrefilled] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill invite code from URL param
  useEffect(() => {
    // invite 是注册页原生口径，join 是裂变闭环口径，两者都收；
    // ref 只做归因留痕，不能当成邀请码用（PlanetX 的 ref 是 PX- 随机数）。
    const code = searchParams.get("invite") ?? searchParams.get("join");
    if (code) {
      setInviteCode(code.toUpperCase());
      setPrefilled(true);
    }
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref.trim());
  }, [searchParams]);

  // Real-time invite code validation
  useEffect(() => {
    const code = inviteCode.trim();
    if (code.length < 4) {
      setInviteValid(null);
      setIsSeedCode(false);
      return;
    }

    // ★ 前端也能识别种子码（NEXT_PUBLIC_ 前缀暴露给客户端）
    const seedCode = process.env.NEXT_PUBLIC_SEED_INVITE_CODE?.trim().toUpperCase();
    if (seedCode && code.toUpperCase() === seedCode) {
      setInviteValid(true);
      setIsSeedCode(true);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/invites/validate?code=${encodeURIComponent(code)}`)
        .then((r) => r.json())
        .then((data) => {
          setInviteValid(data.valid);
          setIsSeedCode(!!data.is_seed);
        })
        .catch(() => {
          setInviteValid(false);
          setIsSeedCode(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [inviteCode]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("两次密码不一致");
      setIsLoading(false);
      return;
    }

    if (!inviteCode.trim()) {
      setError("请输入邀请码");
      setIsLoading(false);
      return;
    }

    if (inviteValid !== true) {
      setError("邀请码无效或已过期");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: {
            invite_code: inviteCode.trim().toUpperCase(),
            ...(refCode ? { referred_by: refCode } : {}),
          },
        },
      });
      if (error) throw error;

      // 注册成功后消费邀请码
      const userId = data?.user?.id;
      if (userId) {
        const inviteCodeToConsume = inviteCode.trim().toUpperCase();
        // 种子码不需要消费（数据库里没有记录）
        const seedCode = process.env.NEXT_PUBLIC_SEED_INVITE_CODE?.trim().toUpperCase();
        if (!seedCode || inviteCodeToConsume !== seedCode) {
          await supabase.rpc("consume_invite", {
            p_code: inviteCodeToConsume,
            p_user_id: userId,
          });
        }
      }

      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "注册失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">创建账号</CardTitle>
          <CardDescription>
            邀请制社区，需要有效邀请码才能注册
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="invite-code">邀请码 *</Label>
                <Input
                  id="invite-code"
                  placeholder="输入邀请码，如 A1B2C3D4"
                  required
                  maxLength={20}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className={cn(
                    "font-mono tracking-widest text-center text-lg",
                    inviteValid === true && "border-green-500 focus-visible:ring-green-500",
                    inviteValid === false && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {inviteValid === true && (
                  <p className="text-xs text-green-600">邀请码有效</p>
                )}
                {inviteValid === false && (
                  <p className="text-xs text-red-500">邀请码无效或已过期</p>
                )}
                {prefilled && (
                  <p className="text-xs text-muted-foreground">
                    通过邀请链接访问，邀请码已自动填入
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">密码</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">确认密码</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || inviteValid !== true}
              >
                {isLoading ? "创建中..." : "注册"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              已有账号？{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                登录
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SignUpForm(props: React.ComponentPropsWithoutRef<"div">) {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><p className="text-muted-foreground">加载中...</p></div>}>
      <SignUpFormInner {...props} />
    </Suspense>
  );
}
