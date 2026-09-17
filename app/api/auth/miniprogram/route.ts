import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/miniprogram
 *
 * 微信小程序登录接口（SSO P0 改造，docs/sso-strategy.md v1.1 §8.1）
 *
 * 流程：
 * 1. 接收 wx.login 的 code + 邀请码
 * 2. 调用微信 API 换取 openid / unionid
 * 3. 按 unionid → openid 顺序在 user_identities 匹配已有用户
 * 4. 无匹配则 admin.createUser（占位邮箱 + email_pending，不用随机密码）
 * 5. admin.generateLink(magiclink) 取 hashed_token（不触发邮件）
 * 6. 落库 auth_exchange_codes，返回一次性 exchange_code（不返回任何 token）
 *
 * 历史缺陷修复对照：
 * - D1/D2：不再查询 profiles.wx_openid / profiles.tier（生产库不存在这两列）
 * - D3：不再返回伪造 access_token / refresh_token
 * - D5：新用户不再走 signUp + 随机密码
 */

// 微信小程序配置
const WX_APPID = process.env.WX_MINIPROGRAM_APPID ?? "";
const WX_SECRET = process.env.WX_MINIPROGRAM_SECRET ?? "";

// 显式开启 mock（本地联调），生产不设此变量
const ALLOW_MOCK = process.env.MP_ALLOW_MOCK === "1";

// 交换码有效期（秒）
const EXCHANGE_CODE_TTL_SECONDS = 60;

// ── 简易 per-IP 限流（单实例内存版；多实例部署时应换 Redis/Upstash）──
const RATE_LIMIT = 10; // 次
const RATE_WINDOW_MS = 60_000; // 窗口
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  // 顺带清理过期桶，防内存膨胀
  if (rateBuckets.size > 1000) {
    for (const [key, bucket] of rateBuckets) {
      if (bucket.resetAt < now) rateBuckets.delete(key);
    }
  }
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

interface WxSessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export async function POST(request: Request) {
  try {
    // Step 0: per-IP 限流（防伪造 code 打爆 jscode2session 与 generateLink 滥用）
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code, invite_code } = body;

    // 参数校验
    if (!code) {
      return NextResponse.json({ error: "缺少微信登录 code" }, { status: 400 });
    }
    if (!invite_code) {
      return NextResponse.json({ error: "缺少邀请码" }, { status: 400 });
    }

    // Step 1: 验证邀请码
    const seedCode = process.env.SEED_INVITE_CODE?.trim().toUpperCase();
    const isSeedCode: boolean = !!(
      seedCode &&
      invite_code.trim().toUpperCase() === seedCode
    );

    const supabaseAdmin = createAdminClient();

    if (!isSeedCode) {
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.rpc("validate_invite", {
          p_code: invite_code.trim().toUpperCase(),
        });

      if (
        inviteError ||
        !inviteData ||
        inviteData.length === 0 ||
        !inviteData[0].valid
      ) {
        return NextResponse.json({ error: "邀请码无效" }, { status: 400 });
      }
    }

    // Step 2: 调用微信 API 换取 openid / unionid
    let openid: string;
    let unionid: string | null = null;
    let isMock = false;

    if (!WX_APPID || !WX_SECRET || ALLOW_MOCK) {
      if (!ALLOW_MOCK) {
        console.warn("[Auth/MP] 微信配置缺失，使用 mock openid");
      }
      isMock = true;
      // 固定 mock 身份（MOCK_WX_OPENID）：用于联调「既有用户二次登录」路径——
      // 第二次登录必须命中 user_identities（unionid 优先）返回 is_new:false。
      // 不设置则每次随机 openid（每次都是新用户，测不了匹配逻辑）。
      const fixedOpenid = process.env.MOCK_WX_OPENID?.trim();
      if (fixedOpenid) {
        openid = fixedOpenid;
        unionid = `mock_union_${fixedOpenid}`;
      } else {
        openid = `mock_wx_${Date.now()}_${randomBytes(4).toString("hex")}`;
        unionid = `mock_union_${openid}`;
      }
    } else {
      const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
      const wxRes = await fetch(wxUrl);
      const wxData: WxSessionResponse = await wxRes.json();

      if (wxData.errcode || !wxData.openid) {
        console.error("[Auth/MP] 微信登录失败:", wxData);
        return NextResponse.json(
          { error: "微信登录失败，请重试" },
          { status: 400 }
        );
      }
      openid = wxData.openid;
      unionid = wxData.unionid ?? null;
    }

    return await issueExchangeCode({
      openid,
      unionid,
      inviteCode: invite_code.trim().toUpperCase(),
      isSeedCode,
      isMock,
    });
  } catch (err) {
    console.error("[Auth/MP] 未知错误:", err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 核心：匹配/创建用户 → 生成一次性交换码
 */
async function issueExchangeCode(params: {
  openid: string;
  unionid: string | null;
  inviteCode: string;
  isSeedCode: boolean;
  isMock: boolean;
}) {
  const { openid, unionid, inviteCode, isSeedCode, isMock } = params;
  const supabaseAdmin = createAdminClient();

  // Step 3: 按 unionid → openid 顺序匹配 user_identities（D6）
  let userId: string | null = null;

  if (unionid) {
    const { data: byUnion, error: errUnion } = await supabaseAdmin
      .from("user_identities")
      .select("user_id")
      .eq("unionid", unionid)
      .limit(1);
    if (errUnion) {
      console.error("[Auth/MP] 身份表查询失败(unionid):", errUnion.message);
      return NextResponse.json(
        { error: "服务器错误，请稍后再试" },
        { status: 500 }
      );
    }
    if (byUnion && byUnion.length > 0) userId = byUnion[0].user_id;
  }

  if (!userId) {
    const { data: byOpenid, error: errOpenid } = await supabaseAdmin
      .from("user_identities")
      .select("user_id")
      .eq("provider", "wechat_mp")
      .eq("provider_uid", openid)
      .limit(1);
    if (errOpenid) {
      console.error("[Auth/MP] 身份表查询失败(openid):", errOpenid.message);
      return NextResponse.json(
        { error: "服务器错误，请稍后再试" },
        { status: 500 }
      );
    }
    if (byOpenid && byOpenid.length > 0) userId = byOpenid[0].user_id;
  }

  const placeholderEmail = `${unionid || openid}@wechat.genz.ltd`;
  let isNewUser = false;

  if (userId) {
    // 已有身份 → 直接登录
  } else {
    // Step 4: 新用户 → admin.createUser（§8.3：占位邮箱 + email_pending，无随机密码）
    isNewUser = true;

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: placeholderEmail,
        email_confirm: true, // 不发确认邮件，占位邮箱本就不可达
        user_metadata: {
          wx_openid: openid,
          wx_unionid: unionid,
          invite_code: inviteCode,
          source: isMock ? "miniprogram_dev" : "miniprogram",
          email_pending: true, // onboarding 时引导补真实邮箱
        },
      });

    if (createError || !created.user) {
      // 恢复路径：占位邮箱确定性生成。若上次注册中途熔断后重试，createUser
      // 报 already exists —— 用 generateLink 按邮箱找回既有用户续跑
      const alreadyExists =
        (createError?.message ?? "").toLowerCase().includes("already");
      if (alreadyExists) {
        const { data: link, error: linkError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: placeholderEmail,
          });
        if (linkError || !link?.user?.id) {
          console.error("[Auth/MP] 找回既有用户失败:", linkError);
          return NextResponse.json(
            { error: "账号状态异常，请联系客服" },
            { status: 500 }
          );
        }
        userId = link.user.id;
        isNewUser = false; // 视为既有用户：不重复消费邀请码/记声誉
        console.warn(
          "[Auth/MP] createUser 报 already exists，已按占位邮箱找回用户:",
          userId
        );
      } else {
        console.error("[Auth/MP] 创建用户失败:", createError);
        return NextResponse.json(
          { error: "注册失败，请重试" },
          { status: 500 }
        );
      }
    } else {
      userId = created.user.id;

      // 消费邀请码（非种子码）
      if (!isSeedCode) {
        const { error: consumeError } = await supabaseAdmin.rpc(
          "consume_invite",
          { p_code: inviteCode, p_user_id: userId }
        );
        if (consumeError) {
          console.warn(
            "[Auth/MP] 消费邀请码失败（用户已创建）:",
            consumeError
          );
        }
      }

      // 记录声誉事件（邀请注册）
      try {
        await supabaseAdmin.rpc("record_reputation_event", {
          p_user_id: userId,
          p_event_type: "invite_signup",
          p_points: 100,
          p_description: isMock
            ? "通过邀请码注册（开发环境）"
            : "通过邀请码注册",
        });
      } catch (e) {
        console.warn("[Auth/MP] 记录声誉事件失败（非致命）:", e);
      }
    }

    // 写入身份绑定表（新建用户必写；找回的半注册用户也补写以修复数据）
    // upsert 容忍唯一约束冲突（上次已落库的极端情形）
    const { error: identityError } = await supabaseAdmin
      .from("user_identities")
      .upsert(
        {
          user_id: userId,
          provider: "wechat_mp",
          provider_uid: openid,
          unionid: unionid,
        },
        { onConflict: "provider,provider_uid" }
      );
    if (identityError) {
      // 熔断：身份未落库的「半注册用户」继续发码，会导致下次登录再建一个号
      console.error("[Auth/MP] 写入 user_identities 失败，熔断:", identityError);
      return NextResponse.json(
        { error: "注册失败，请重试" },
        { status: 500 }
      );
    }
  }

  // Step 5: 读取用户资料与档位（tier 来自 user_tiers，D2）
  const [{ data: profile, error: profileError }, { data: tierRow }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("username").eq("id", userId).limit(1),
      supabaseAdmin.from("user_tiers").select("tier").eq("user_id", userId).limit(1),
    ]);
  if (profileError) {
    console.warn("[Auth/MP] 读取 profiles 失败（非致命）:", profileError.message);
  }

  const username =
    profile && profile.length > 0 ? profile[0].username : null;
  const tier = tierRow && tierRow.length > 0 ? tierRow[0].tier : "free";

  // Step 6: generateLink(magiclink) 取 hashed_token
  // admin.generateLink 不发送邮件（v2 API），仅返回 action_link + hashed_token
  const { data: link, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: placeholderEmail,
    });

  if (linkError || !link?.properties?.hashed_token) {
    console.error("[Auth/MP] generateLink 失败:", linkError);
    return NextResponse.json(
      { error: "登录失败，请重试" },
      { status: 500 }
    );
  }

  // Step 7: 落库一次性交换码（60s 过期）
  const exchangeCode = randomBytes(32).toString("base64url");
  const { error: insertError } = await supabaseAdmin
    .from("auth_exchange_codes")
    .insert({
      code: exchangeCode,
      user_id: userId,
      token_hash: link.properties.hashed_token,
      expires_at: new Date(
        Date.now() + EXCHANGE_CODE_TTL_SECONDS * 1000
      ).toISOString(),
    });

  if (insertError) {
    console.error("[Auth/MP] 写入 auth_exchange_codes 失败:", insertError);
    return NextResponse.json({ error: "登录失败，请重试" }, { status: 500 });
  }

  // Step 8: 返回一次性交换码（不再返回任何 token，D3）
  return NextResponse.json({
    exchange_code: exchangeCode,
    expires_in: EXCHANGE_CODE_TTL_SECONDS,
    user: {
      id: userId,
      username,
      is_new: isNewUser,
      source: isMock ? "miniprogram_dev" : "miniprogram",
    },
    tier,
    is_seed: isSeedCode,
  });
}
