import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /auth/exchange?code=<一次性交换码>[&next=<同源路径>]
 *
 * 小程序 web-view 内 H5 的会话建立端点（SSO P0，docs/sso-strategy.md v1.1 §8.2）
 *
 * 流程：
 * 1. 原子消费交换码：update ... where code=? and consumed_at is null and expires_at>now()
 *    以受影响行数判定成败（消除 select→update 两步的并发重放窗口）
 * 2. verifyOtp(token_hash, magiclink) 建立真实 session（cookie 由 @supabase/ssr 写入）
 * 3. 跳转 next（仅允许同源路径，防开放重定向）
 *
 * 失败一律跳 /auth/error，不回显内部细节。
 */

function safeNextPath(raw: string | null): string {
  // 仅允许站内路径（以 / 开头且不以 // 开头），防开放重定向
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/error?error=missing_exchange_code", request.url)
    );
  }

  // Step 1: 原子消费（一次性 + 未过期才能 update 成功）
  const supabaseAdmin = createAdminClient();
  const { data: row, error: consumeError } = await supabaseAdmin
    .from("auth_exchange_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("code", code)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id, token_hash")
    .single();

  if (consumeError || !row) {
    return NextResponse.redirect(
      new URL("/auth/error?error=invalid_or_expired_code", request.url)
    );
  }

  // 顺带清理过期超过 1 天的旧码（非阻塞失败不影响主流程）
  // 注意：supabase-js v2 的 PostgrestFilterBuilder 是 thenable 而非 Promise，
  // 没有 .catch 方法 —— 用解构 error 忽略即可
  await supabaseAdmin
    .from("auth_exchange_codes")
    .delete()
    .lt("expires_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .then(
      () => undefined,
      () => undefined
    );

  // Step 2: verifyOtp 建立真实 session（cookie 写入）
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: row.token_hash,
    type: "magiclink",
  });

  if (verifyError) {
    console.error("[Auth/Exchange] verifyOtp 失败:", verifyError.message);
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(verifyError.message)}`,
        request.url
      )
    );
  }

  // Step 3: 跳转（cookie 已随 verifyOtp 写入响应）
  return NextResponse.redirect(new URL(next, request.url));
}
