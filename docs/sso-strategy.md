# Genzer Terminal — SSO 统一身份战略方案

> 版本：v1.1
> 日期：2026-09-17
> 状态：草案（待评审）
> v1.1 变更：补 §2.4 实地勘察记录（生产库实测）；据此修正 §6 P0/P1 边界（P0 吸收身份表模型、P1 历史回填标注不适用）；其余结构未动
> 定位：指导 Web / 微信小程序 / 未来多端、多域名的身份认证统一改造

---

## 0. 文档目的

Genzer Terminal 目前存在 **Web（邮箱密码）** 与 **微信小程序（openid）** 两套彼此独立的认证通路，同一自然人会生成两个 `auth.users` 账号，身份割裂、会话不通。

本方案的目标是：以 **Supabase Auth 作为唯一身份源（IdP）**，建立「一个自然人 = 一个主账号 = 多个可绑定身份」的统一模型，并给出分阶段、可回滚的改造路线。

适用范围：`app/`（Next.js Web）、`miniprogram/`（微信小程序）、`supabase/`（数据库与 Auth 配置）。

---

## 1. 进展快照（2026-09-17）

基础设施与部署已验证通过，SSO 改造将在此基线上进行：

| 项 | 状态 | 备注 |
|---|---|---|
| 生产域名 | ✅ | `https://www.genz.ltd`，HTTPS 正常 |
| 登录链路 | ✅ | `zervi@genz.ltd` 登录后正确跳转 `/protected` |
| 数据库链路 | ✅ | Layer 0 名片、用户名均从 Supabase 读出 |
| 会话持久化 | ✅ | 刷新后仍停留 `/protected` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 已设为 `https://www.genz.ltd` |
| `og:image` | ✅ | 已指向 `https://www.genz.ltd/opengraph-image.png` |
| CI 链路 | ✅ | 空提交 `030d36e` 成功触发 Vercel 部署 |
| `app.genz.ltd` | ⏳ | 绑定方案已定（5 步顺序），尚未执行 |
| Preview 环境变量 | ⚠️ | Supabase 两变量待补勾 Preview |

**已知约束**：`NEXT_PUBLIC_` 变量为**构建时内联**，改动后必须重新部署才生效；Supabase Redirect URLs 与 `NEXT_PUBLIC_SITE_URL` 必须保持一致，否则出现「认证成功但回跳无 session」。

---

## 2. 现状盘点（AS-IS）

### 2.1 认证链路全景

**Web 端**

```
邮箱 + 密码
  → supabase.auth.signInWithPassword()
  → @supabase/ssr 写入 cookie session
  → lib/supabase/proxy.ts 每请求刷新 + 保护路由
  → 受保护页 /protected /dashboard /settings /onboarding /discover
```

**微信小程序端**

```
wx.login() → code
  → POST /api/auth/miniprogram { code, invite_code }
  → jscode2session 换 openid（+ unionid）
  → 查 profiles.wx_openid 匹配，否则 signUp 虚拟邮箱
  → 返回 access_token / refresh_token
  → 小程序存 storage → wx.reLaunch web-view ?entry=login
```

**H5（web-view 内）**

```
URL 携带 miniprogram_token
  → initMiniProgramBridge() 读取
  → 仅 console.log，未建立 Supabase session
```

### 2.2 关键文件

| 文件 | 职责 |
|---|---|
| `lib/supabase/client.ts` | 浏览器端 Supabase client |
| `lib/supabase/server.ts` | 服务端 client（读 cookie） |
| `lib/supabase/proxy.ts` | 会话刷新 + 路由保护 |
| `components/login-form.tsx` | Web 登录表单 |
| `components/sign-up-form.tsx` | Web 注册（含邀请码） |
| `app/auth/confirm/route.ts` | OTP / magic link 确认（`token_hash` + `type`） |
| `app/api/auth/miniprogram/route.ts` | 小程序登录（**问题集中地**） |
| `lib/miniprogram-bridge.ts` | H5 ↔ 小程序桥接（**会话同步未完成**） |
| `miniprogram/pages/auth/login.js` | 小程序登录页（邀请码 → 微信授权） |
| `supabase/config.toml` | Auth 配置（**未启用任何 OAuth provider**） |

### 2.3 已识别缺陷

> 编号 D1–D10，作为后续改造的验收对照。

| 编号 | 缺陷 | 位置 | 影响 |
|---|---|---|---|
| **D1** | `profiles.wx_openid` 列在仓库 migration 中**未定义**，代码却在查询 | `api/auth/miniprogram/route.ts:96` | 查询报 `42703 undefined column` → 登录 500 |
| **D2** | `profiles.tier` 不存在，档位实际在 `user_tiers.tier` | `api/auth/miniprogram/route.ts:95` | 同上，返回档位恒为默认 |
| **D3** | **返回的 token 是伪造的**：`access_token` 取 `action_link`，`refresh_token` 硬编码 `"mp-refresh-token"` | `route.ts:193-204` | 小程序拿到的不是真 session，后续鉴权必然失败 |
| **D4** | H5 未建立 session，`initMiniProgramBridge` 只 `console.log` | `miniprogram-bridge.ts:186-194` | web-view 内始终未登录 |
| **D5** | 虚拟邮箱 `${openid}@wx.miniprogram` + 随机密码注册 | `route.ts:121-126` | 污染 `auth.users`；用户无法用密码登录或找回 |
| **D6** | 仅用 `openid` 匹配，`unionid` 只存未用 | `route.ts:87,130` | 跨应用（小程序/公众号/开放平台）无法统一身份 |
| **D7** | 无身份绑定与账号合并机制（`enable_manual_linking = false`） | `config.toml:180` | 同一人微信 + 邮箱 = 两个账号 |
| **D8** | cookie 不跨子域（`www` / `app` / preview 各自独立） | `proxy.ts` | 多域名间无法共享登录态 |
| **D9** | 未启用任何第三方 OAuth provider | `config.toml` | 无 Google / Apple / 微信网页登录 |
| **D10** | 邀请码校验逻辑重复实现（种子码判断在小程序 route 内重写） | `route.ts:49-65` | 准入策略分散，易出现绕过 |

> ⚠️ **D1 / D2 已于 2026-09-17 生产库实测坐实**（见 §2.4）：`profiles.wx_openid` 与 `profiles.tier` 均不存在，小程序登录当前确认处于不可用状态（原「需先核实」事项已完成）。

### 2.4 实地勘察记录（2026-09-17，v1.1 补）

**方式**：只读探测——PostgREST（service key）+ Admin Auth API，未写入任何数据，无 probe 副作用。

| 探测项 | 实测结果 | 结论 |
|---|---|---|
| `profiles?select=tier` | 400 `42703 column profiles.tier does not exist` | **D2 坐实** |
| `profiles?select=wx_openid` | 400 `42703 column profiles.wx_openid does not exist` | **D1 坐实** |
| `profiles` 实际列 | `id, username, email_hash, layer0/1/2, personality_type, traits, visibility_settings, invite_quota, created_at, updated_at` | 与 migration 定义一致，生产库无手动加列 |
| `user_tiers` | 200，空表 | 表存在、无数据 |
| `user_identities` | 404 schema cache 无此表 | P1 表未建（符合草案状态） |
| `auth_exchange_codes` | 404 无此表 | P0 表未实施（符合草案状态） |
| `auth.users` | **仅 1 人**：`zervi@genz.ltd`（2026-08-31 创建，2026-09-17 活跃）；无 `@wx.miniprogram` 虚拟邮箱；raw_user_meta_data 无 wx 字段 | **D5 污染不存在**（登录流程在 D1 处即失败，从未走到虚拟邮箱注册） |
| `invites` | 200，有种子邀请码（zervi 签发，2026-09-30 过期） | 邀请码体系健康 |

**勘察推论**：

1. **小程序登录确认不可用**：`route.ts` 查用户第一步即 42703。
2. **原 P1 的两块历史包袱实际不存在**：「回填历史数据」无数据可回填（库内 0 条 wx 记录）；「历史账号合并」无账号可合并（用户基数 = 1）。§6 P1 相应任务已标注不适用。
3. **现在是 P0+P1 合并施工的最佳窗口**：用户基数 = 1、零迁移、零合并风险。原「P0 先加 `profiles.wx_openid` 列止血 → P1 再换 `user_identities` 表」的顺序是为有存量用户的场景设计的；实测后应**跳过加列，P0 直接建 `user_identities` 并重写 route 走新模型**，避免对 route.ts 二次改写。
4. **切库丢用户留观**：生产 Supabase 项目 2026-09-17 切至 `ihuddnluwggbdppheixu`，新库仅 1 用户。若旧项目存有其他注册用户，切库即丢号——需 Owner 确认旧项目数据是否需迁移（超出本次勘察范围）。

---

## 3. 问题诊断：为什么现在不是 SSO

根本矛盾在于 **身份标识不统一** + **会话不互通**：

1. **标识维度不同**：Web 以 `email` 为主键，小程序以 `openid` 为主键，两者没有映射关系，系统无法判断「这是同一个人」。
2. **会话载体不同**：Web 用 cookie（@supabase/ssr 管理），小程序用 storage 存 token，而该 token 本身是伪造的（D3），两条链路从未真正交汇。
3. **域边界**：即使小程序拿到真 token，web-view 是独立上下文，且 cookie 不跨 `www.genz.ltd` / `app.genz.ltd`（D8）。

因此改造的核心不是「加一个登录按钮」，而是建立**统一身份层**并让所有端通过**同一套交换机制**获取真实 session。

---

## 4. 目标架构（TO-BE）

### 4.1 设计原则

1. **单一身份源**：Supabase Auth 是唯一 IdP，`auth.users.id` 是全局唯一用户主键。
2. **主账号 + 多身份**：一个主账号可绑定多个身份（邮箱、微信 openid、unionid、未来 OAuth），身份可增可解绑。
3. **不伪造凭证**：任何端最终都必须拿到**真实** Supabase session，禁止自造 token（消除 D3/D5）。
4. **一次性交换**：跨端传递一律使用一次性、短时效的交换码，禁止在 URL 中传递长期有效的 access_token。
5. **准入策略集中**：邀请码校验收敛到单一服务，所有注册入口复用（消除 D10）。

### 4.2 身份模型

```
auth.users (Supabase 唯一身份源)
   │  1:1
   ▼
profiles                        ← 主账号业务档案（username / layer0-2 / 可见性）
   │  1:N
   ▼
user_identities                 ← 【新增】身份绑定表
   ├ provider      text         'email' | 'wechat_mp' | 'wechat_oa' | 'google' | 'apple'
   ├ provider_uid  text         openid / unionid / sub / email
   ├ unionid       text         微信跨应用统一标识（可空）
   └ is_primary    boolean      主身份（用于展示与找回）

user_tiers                      ← 已有：档位与治理权重（与 profiles 分离，保持不变）
```

**关键决策**：跨微信系应用统一身份的锚点是 **`unionid`**（同一开放平台账号下唯一），`openid` 仅在单个应用内唯一。因此匹配优先级为：

```
unionid 命中 → 视为同一人（直接登录）
  ↓ 未命中
openid 命中 → 当前小程序内已注册（登录，并回填 unionid）
  ↓ 未命中
新用户 → 创建主账号 + 写入 user_identities
```

### 4.3 会话模型（跨端统一交换）

引入**一次性交换码（one-time exchange code）**，替代现在的假 token：

```
[小程序]
  wx.login → code
      │
      ▼
  POST /api/auth/miniprogram
      ├ 校验邀请码（统一服务）
      ├ jscode2session → openid + unionid
      ├ 匹配/创建主账号（unionid 优先）
      ├ admin.generateLink({ magiclink }) → hashed_token
      ├ 生成一次性 code（Redis/表存储，60s 有效，一次性）
      └ 返回 { exchange_code }
      │
      ▼
  web-view 打开 https://www.genz.ltd/auth/exchange?code=XXX
      │
      ▼
[H5] GET /auth/exchange
      ├ 校验 code（未使用 + 未过期）
      ├ 换取 hashed_token
      ├ supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
      ├ ✅ 建立真实 cookie session
      └ 立即作废 code → redirect 目标页
```

小程序原生侧若需调用 API，使用 `verifyOtp` 返回的 `access_token` / `refresh_token` 经 `setSession` 注入，而非硬编码串。

### 4.4 域名策略

认证统一收敛到主域，避免多域 session 分裂：

- 认证与业务统一在 `www.genz.ltd`（当前已验证可用）
- 若后续启用 `app.genz.ltd`，cookie 需显式设置 `domain = .genz.ltd`，并保证两域的 `NEXT_PUBLIC_SITE_URL`、Supabase Redirect URLs 同步更新
- Supabase → URL Configuration 中 Site URL 与 Redirect URLs 必须包含所有实际使用域名

---

## 5. 技术方案选型

| 方案 | 描述 | 评价 |
|---|---|---|
| **A. Supabase 原生 + Admin 交换码**（推荐） | 用 `admin.generateLink` 生成 magiclink，前端 `verifyOtp` 换真 session | ✅ 完全复用 Supabase Auth 与 RLS；改造量可控；无自签凭证风险 |
| B. 自建 OIDC IdP 包装微信 | 自建 OIDC 服务，作为 Supabase 第三方 provider | ⚠️ 能力最完整，但需维护独立服务与证书，当前阶段过度设计 |
| C. 中间层自签 JWT | 脱离 Supabase Auth，自签 token 校验 | ❌ 会失去 RLS 与 `auth.uid()`，数据层权限体系需重写 |
| D. 托管服务（Clerk / Auth0） | 替换 Supabase Auth | ❌ 与现有 `auth.users` / RLS / `profiles.id` 外键强耦合，迁移成本极高 |

**结论：采用方案 A。**

---

## 6. 分阶段改造路线

### P0 — 止血 + 身份模型一步到位（v1.1 修正）✅ 最高优先级

**目标**：修复小程序登录的致命缺陷，使其能拿到**真实** session；并利用「用户基数 = 1」的窗口（§2.4），把原 P1 的身份表模型一并落地，避免二次改写 route.ts。

- ~~核实并补齐 schema：`profiles.wx_openid`~~ → **勘察已坐实（§2.4），不加该列**，改为直接落地：
  - 新建 `user_identities` 表（§7.1 SQL 原样可用）
  - 新建 `auth_exchange_codes` 表（§7.2 SQL 原样可用）
- 重写 `app/api/auth/miniprogram/route.ts`：
  - 删除虚拟邮箱注册与随机密码（D5）
  - 删除伪造 token 返回（D3）
  - 删除 `profiles.wx_openid` / `profiles.tier` 查询（D1/D2），改为查 `user_identities`（**unionid 优先、openid 兜底**，吸收原 P1 匹配逻辑）；`tier` 改读 `user_tiers`
  - 新用户创建改走 `admin.createUser` + 写入 `user_identities`
- 新增 `app/auth/exchange/route.ts`：交换码 → `verifyOtp` → cookie session
  - **交换码消费必须原子化**：`update ... set consumed_at = now() where code = ? and consumed_at is null and expires_at > now() returning *`，以受影响行数判定成败（消除 §8.2 select→update 两步的并发重放窗口）
- `/api/auth/miniprogram` 加 per-IP 限流（防伪造 code 打爆 jscode2session 与 `generateLink` 滥用）
- 修复 `initMiniProgramBridge`：不再只 log，改为引导走 `/auth/exchange`（D4）

**施工约束（v1.1 补）**：小程序端代码改动（存储假 token → `exchange_code`、reLaunch URL 变化）撞 CN/微信线提审冻结——P0 拆两半：**后端侧先行**（route / exchange / schema / bridge，不触小程序包）；小程序端改动等解冻，或评估 web-view URL 保持不变时的最小改动集。

**验收**：小程序登录后，web-view 内 H5 处于已登录状态，能读到当前用户 profile；登录全程**不触发**用户邮箱收到 magiclink 邮件（防 `admin.generateLink` 邮件副作用回归，列入实测项）。

**风险**：`verifyOtp` 对 magiclink 有频控（`token_verifications` 限流），需评估；`admin.generateLink` 需 `SUPABASE_SERVICE_ROLE_KEY`。

---

### P1 — 身份统一（v1.1 修正：范围收窄）

**目标**：建立统一身份层，消除「一人多号」。

- ~~新建 `user_identities` 表（见 §7）~~ → **已前移至 P0**（勘察后无存量用户，二次改写 route 无意义，见 §2.4）
- ~~登录匹配改为 **unionid 优先、openid 兜底**（D6）~~ → **已前移至 P0**
- ~~回填历史数据：从 `auth.users.raw_user_meta_data` 抽取 `wx_openid` / `wx_unionid` 写入 `user_identities`~~ → **不适用**（§2.4：库内 0 条 wx 记录，无数据可回填）
- 提供账号绑定入口：已登录的 Web 用户可绑定微信（消除 D7）
- 视需要开启 `enable_manual_linking`

**验收**：同一用户用微信登录与用邮箱登录，`auth.users.id` 相同；profile 与名片数据不重复。

---

### P2 — 跨端会话打通

**目标**：小程序 ↔ H5 ↔ Web 任意切换均保持登录态。

- 统一一次性交换码服务（含过期、一次性、重放防护）
- web-view 打开时自动携带交换码（避免 token 长期暴露于 URL）
- 退出登录三端同步（小程序 `requestLogout` → 清除 Web session）

**验收**：小程序登录 → 打开 web-view → 已登录；Web 退出 → 小程序 token 失效。

---

### P3 — 第三方登录

**目标**：接入标准 OAuth，降低注册摩擦。

- Supabase Dashboard 启用 provider（Google / Apple 优先；微信网页授权需开放平台 + 自建 OIDC 桥接，归入 B 方案的轻量版）
- 前端 `signInWithOAuth({ provider, options: { redirectTo } })`
- `redirectTo` 必须走 `NEXT_PUBLIC_SITE_URL`，且加入 Supabase Redirect URLs 白名单
- OAuth 回调同样写入 `user_identities`

**验收**：Google 登录可注册并自动创建 profile，与邮箱账号可合并。

---

### P4 — 多域名统一

**目标**：`www` / `app` / preview 之间共享登录态。

- 认证域收敛；cookie 设置 `domain = .genz.ltd`
- 所有域的 `NEXT_PUBLIC_SITE_URL` 与 Supabase Redirect URLs 保持同步
- Preview 环境补齐 Supabase 变量并重部署（`NEXT_PUBLIC_` 构建时内联）

**验收**：在 `app.genz.ltd` 登录后跳转 `www.genz.ltd` 仍保持登录。

---

### P5 — 企业 SSO（可选，视 B 端需求）

SAML 2.0 / OIDC 企业目录对接，Supabase 需 Pro 计划及以上。当前无明确需求，**暂不实施**。

---

## 7. 数据模型改造

### 7.1 新增身份绑定表

```sql
-- supabase/migrations/2026XXXXXXXXXX_user_identities.sql

create table if not exists public.user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('email', 'wechat_mp', 'wechat_oa', 'google', 'apple')),
  provider_uid text not null,        -- openid / unionid / sub / email
  unionid text,                      -- 微信跨应用统一标识
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),

  unique (provider, provider_uid)
);

create index if not exists idx_user_identities_user  on public.user_identities(user_id);
create index if not exists idx_user_identities_union on public.user_identities(unionid) where unionid is not null;

alter table public.user_identities enable row level security;

create policy "identities_select_own"
  on public.user_identities for select
  using (auth.uid() = user_id);

-- 注：写入仅允许服务端 service_role 完成，不开放客户端 insert/update
```

### 7.2 一次性交换码

```sql
create table if not exists public.auth_exchange_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null default (now() + interval '60 seconds'),
  consumed_at timestamptz
);

create index if not exists idx_exchange_codes_expiry on public.auth_exchange_codes(expires_at);

alter table public.auth_exchange_codes enable row level security;
-- 无任何客户端策略：仅 service_role 可读写
```

### 7.3 待核实项（P0 第一步）

> ✅ **已于 2026-09-17 执行完毕**，结果见 §2.4：`profiles.wx_openid` / `profiles.tier` 均不存在（D1/D2 坐实），生产库无手动加列。

```sql
-- 在生产库执行，确认 D1/D2 真实情况
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;
```

---

## 8. 关键实现骨架

### 8.1 小程序登录（改造后）

```ts
// app/api/auth/miniprogram/route.ts —— 核心流程
// 1) 统一邀请码校验（复用现有 validate_invite RPC）
// 2) jscode2session → { openid, unionid }
// 3) 按 unionid → openid 顺序在 user_identities 中匹配主账号
// 4) 无匹配则 admin.createUser（不再使用虚拟邮箱/随机密码）
// 5) admin.generateLink({ type: 'magiclink', email }) → hashed_token
// 6) 落库 auth_exchange_codes，返回一次性 code

const { data: link } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email,                                   // 主账号真实邮箱（无邮箱场景见 §8.3）
});
const hashedToken = link.properties.hashed_token;

const code = crypto.randomUUID();
await supabaseAdmin.from('auth_exchange_codes').insert({
  code, user_id: userId, token_hash: hashedToken,
});

return NextResponse.json({ exchange_code: code });   // 不再返回伪造 token
```

### 8.2 H5 交换端点

```ts
// app/auth/exchange/route.ts
const code = searchParams.get('code');

// service_role 校验：未消费 + 未过期
const { data: row } = await supabaseAdmin
  .from('auth_exchange_codes')
  .select('user_id, token_hash, expires_at, consumed_at')
  .eq('code', code)
  .single();

if (!row || row.consumed_at || new Date(row.expires_at) < new Date()) {
  return redirect('/auth/error?error=invalid_or_expired_code');
}

// 立即作废，防重放
await supabaseAdmin
  .from('auth_exchange_codes')
  .update({ consumed_at: new Date().toISOString() })
  .eq('code', code);

// 建立真实 session（写 cookie）
const supabase = await createClient();
const { error } = await supabase.auth.verifyOtp({
  token_hash: row.token_hash,
  type: 'magiclink',
});

return redirect(error ? `/auth/error?error=${error.message}` : '/protected');
```

### 8.3 无邮箱场景说明

微信登录可能拿不到邮箱。推荐**延迟索取**：先创建主账号（可用 `${unionid}@wechat.genz.ltd` 占位并标记 `email_pending`），在用户进入 onboarding 时引导补全真实邮箱并标记 `is_primary`。

> 与现存的 `${openid}@wx.miniprogram` 区别在于：占位邮箱会被后续真实邮箱替换，且**不再依赖随机密码**，认证完全走 magiclink / 交换码通路。

---

## 9. 安全与合规

| 项 | 要求 |
|---|---|
| Service Role Key | 仅服务端使用，绝不进入 `NEXT_PUBLIC_*`；建议在 Vercel 单独配置为服务端变量 |
| 交换码 | 60s 过期、一次性、消费即作废；禁止长期 token 出现在 URL |
| Redirect 白名单 | Supabase Redirect URLs 只列入实际域名，禁用通配符开放重定向 |
| Refresh Token | 已开启 rotation（`enable_refresh_token_rotation = true`），改造需保持 |
| RLS | 新增表默认开启 RLS；`user_identities` 写入仅 service_role |
| 频控 | 关注 `token_verifications` / `sign_in_sign_ups` 限流，必要时调高并接入 captcha |
| 审计 | 身份绑定/解绑需记录事件（可复用 `record_reputation_event` 类似的审计表） |

---

## 10. 风险与回滚

| 风险 | 影响 | 应对 |
|---|---|---|
| `verifyOtp` 频控导致登录失败 | 小程序登录不可用 | 压测评估；必要时启用 captcha 或调高阈值 |
| 历史账号合并出错 | 用户数据错乱 | 合并前全量备份；提供「仅绑定、不合并」的保守模式 |
| 交换码被截获 | 账号被盗 | 60s + 一次性 + 绑定 UA/IP 校验（可选） |
| unionid 缺失（未关联开放平台） | 跨应用无法统一 | 强制将小程序绑定至微信开放平台账号 |
| P0 schema 变更影响线上 | 登录 500 | 先在 Preview 验证，再灰度；migration 需可回滚 |

**回滚策略**：每个阶段独立提交、独立部署；`auth_exchange_codes` 与 `user_identities` 均为新增表，删除不影响既有数据，可安全回退。

---

## 11. 验收标准 Checklist

- [x] P0：核实生产 `profiles` 实际列（2026-09-17 完成，见 §2.4；决策：不加列，改落地 `user_identities`）
- [ ] P0：小程序登录返回一次性 `exchange_code`，不再出现硬编码 token
- [ ] P0：web-view 内 H5 完成交换后处于已登录状态
- [ ] P0：`user_identities` 落地，unionid 优先匹配生效（v1.1 前移自 P1）
- [ ] P1：同一用户微信 + 邮箱登录得到同一 `auth.users.id`
- [ ] P2：任一端退出，三端会话同步失效
- [ ] P3：至少一个第三方 provider 可用且与主账号可合并
- [ ] P4：多域名间登录态共享（若启用 `app.genz.ltd`）
- [ ] 全程：无 service_role 泄露至客户端；新增表 RLS 已开启

---

## 12. 待决策

1. **是否强制绑定微信开放平台**以获取 `unionid`？（决定 P1 能否真正跨应用统一）
2. **邮箱是否作为注册必填**？若否，占位邮箱策略需产品确认（§8.3）。
3. **`app.genz.ltd` 是否继续推进**？其与 `www` 并存会显著提高 P4 复杂度。
4. **第三方 provider 优先级**：Google / Apple / 微信网页，先做哪个？
5. **是否开启 `enable_manual_linking`** 以允许用户自助绑定身份？

---

*本文档为改造工作的唯一基准；实施过程中若与现状不符，应先更新本文件再继续。*
