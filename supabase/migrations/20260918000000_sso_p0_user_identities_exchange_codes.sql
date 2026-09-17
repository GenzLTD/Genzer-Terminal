-- ════════════════════════════════════════════════════════════
-- SSO P0（docs/sso-strategy.md v1.1 §7.1 / §7.2）
-- 1) user_identities      统一身份绑定表（unionid 优先匹配）
-- 2) auth_exchange_codes  小程序 → H5 一次性交换码（60s 过期）
-- 幂等：全部 create if not exists / create index if not exists
-- ════════════════════════════════════════════════════════════

-- 一、身份绑定表
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

create index if not exists idx_user_identities_user
  on public.user_identities(user_id);
create index if not exists idx_user_identities_union
  on public.user_identities(unionid) where unionid is not null;

alter table public.user_identities enable row level security;

drop policy if exists "identities_select_own" on public.user_identities;
create policy "identities_select_own"
  on public.user_identities for select
  using (auth.uid() = user_id);

-- 注：写入仅允许服务端 service_role 完成，不开放客户端 insert/update 策略

-- 二、一次性交换码
create table if not exists public.auth_exchange_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null default (now() + interval '60 seconds'),
  consumed_at timestamptz
);

create index if not exists idx_exchange_codes_expiry
  on public.auth_exchange_codes(expires_at);

alter table public.auth_exchange_codes enable row level security;
-- 无任何客户端策略：仅 service_role 可读写
