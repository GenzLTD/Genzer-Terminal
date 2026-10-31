import { normalizeRegion, type BillingRegion } from "@/lib/payment-plans";

// =============================================================
// 增长闭环的参数口径（2026-10-31 定）
//
// 三个参数各管一件事，不要混用：
//   region —— 计费地区，只影响价格展示，不参与鉴权
//   join   —— 真邀请码，必须能过 /api/invites/validate
//   ref    —— 归因来源（PlanetX 生成的 PX-xxxx 或任何渠道标记），
//             只用于留痕，不是邀请码，不能顶替 join
//
// 为什么必须分开：注册页真正读取的是 ?invite=，
// 而 PlanetX 的分享链接发的是 ?ref=PX-xxxx（随机数，不是终端邀请码）。
// 把 ref 当邀请码送进注册页必然校验失败 —— 闭环就断在最后一步。
// =============================================================

export type GrowthParams = {
  region: BillingRegion;
  /** 真邀请码（来自 join，或兼容 invite） */
  join: string | null;
  /** 归因来源，非邀请码 */
  ref: string | null;
};

type RawParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

function pick(raw: RawParams, key: string): string | null {
  if (!raw) return null;
  const v =
    raw instanceof URLSearchParams ? raw.get(key) : raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
}

export function parseGrowthParams(raw: RawParams): GrowthParams {
  return {
    region: normalizeRegion(pick(raw, "region")),
    // invite 是注册页自己的口径，一并兼容，方便老链接继续用
    join: pick(raw, "join") ?? pick(raw, "invite"),
    ref: pick(raw, "ref"),
  };
}

/** 注册页读的是 invite，这里把 join 落到那个名字上；ref 单独带过去做归因。 */
export function signUpUrl(params: GrowthParams): string {
  const qs = new URLSearchParams();
  if (params.join) qs.set("invite", params.join.toUpperCase());
  if (params.ref) qs.set("ref", params.ref);
  const q = qs.toString();
  return q ? `/auth/sign-up?${q}` : "/auth/sign-up";
}

export function pricingUrl(params: GrowthParams): string {
  const qs = new URLSearchParams();
  qs.set("region", params.region);
  if (params.ref) qs.set("ref", params.ref);
  return `/pricing?${qs.toString()}`;
}
