// =============================================================
// 跨站口径（2026-10-18 定）
//
// 终端（www.genz.ltd）是独立产品：页面与认证仍由 Vercel + Supabase 承载。
// 但「业务面」在新加坡（Vultr SG）：收银/注册 = tspace.genz.ltd，
// API = api.genz.ltd，共识圈 = circle.genz.ltd（gfcc kernel :5211）。
//
// 所有跨站地址集中在此，禁止在页面里散落硬编码域名：
// 换解析、换域名只改 env，不改组件。
// =============================================================

const trimTrailing = (s: string) => s.replace(/\/+$/, "");

export const GENZ_LINKS = {
  /** 品牌 / 收银主站（Vercel，营销站 SPA） */
  web: trimTrailing(process.env.NEXT_PUBLIC_GENZ_WEB_URL || "https://genz.ltd"),
  /** 新加坡后端 API（Vultr SG），CORS 已放行 app.genz.ltd */
  api: trimTrailing(process.env.NEXT_PUBLIC_GENZ_API_BASE || "https://api.genz.ltd"),
  /** T 空间 SaaS（Vultr SG，含收银/注册入口） */
  tspace: trimTrailing(
    process.env.NEXT_PUBLIC_GENZ_TSPACE_URL || "https://tspace.genz.ltd",
  ),
  /** 共识圈（Vultr SG，gfcc kernel :5211 经 nginx /circle/ 暴露） */
  circle: trimTrailing(
    process.env.NEXT_PUBLIC_GENZ_CIRCLE_URL || "https://circle.genz.ltd/circle",
  ),
} as const;

/** 注册/收银入口（与 genz-web 的 appRegisterUrl 同一口径） */
export const GENZ_REGISTER_URL = `${GENZ_LINKS.tspace}/register`;
/** 定价页（营销站） */
export const GENZ_PRICING_URL = `${GENZ_LINKS.web}/pricing`;
/** 共识圈首页 */
export const GENZ_CIRCLE_URL = `${GENZ_LINKS.circle}/`;

export type GenzLink = {
  key: string;
  label: string;
  href: string;
};

/** 终端里的新加坡业务入口（顺序即展示顺序） */
export const GENZ_BUSINESS_LINKS: GenzLink[] = [
  { key: "tspace", label: "T空间", href: GENZ_LINKS.tspace },
  { key: "circle", label: "共识圈", href: GENZ_CIRCLE_URL },
  { key: "pricing", label: "定价", href: GENZ_PRICING_URL },
];

/** 新窗口链接的通用属性（noopener 防 window.opener 劫持） */
export const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;
