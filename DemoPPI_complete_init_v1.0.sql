-- ============================================================

-- DemoPPI — 完整数据库初始化 SQL (v1.0 Final)

-- 来源：合并 supabase/migrations/ 下 6 个迁移文件

-- 用途：在 Supabase SQL Editor 中一次性执行即可初始化全部基础设施

-- 幂等：全部使用 if not exists / or replace / on conflict do nothing

-- ============================================================

-- 迁移清单:

--   ① 20260220000000_initial_schema    → profiles / connections / 标签库

--   ② 20260220000001_storage_avatars    → avatars bucket + RLS

--   ③ 20260530000000_invites            → invites 表 + 3 RPC (validate/consume/generate)

--   ④ 20260531000000_fixes_and_seed     → 种子邀请码 + handle_new_user_invite 触发器

--   ⑤ 20260531000000_quota_system       → 配额 / 声誉 / 徽章 / 治理 / 5 RPC

--   ⑥ 20260604000000_trust_fss_records  → Trust FSS 审计表

-- ============================================================



-- ============================================================

-- ██  第一部分：核心 MVP — profiles / connections / 标签库

-- ============================================================



-- 1.1 PROFILES 表（扩展 auth.users）

create extension if not exists pgcrypto;

create table if not exists public.profiles (

  id uuid primary key references auth.users(id) on delete cascade,

  username text unique,

  layer0 jsonb default '{}',

  layer1 jsonb default '{}',

  layer2 jsonb default '{}',

  visibility_settings jsonb default '{"default_layer": 0, "layer_1_rule": "connected", "show_in_discover": true}',

  invite_quota int not null default 5,

  created_at timestamptz default now() not null,

  updated_at timestamptz default now() not null

);



alter table public.profiles enable row level security;



drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles"

  on public.profiles for select

  using (true);



drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"

  on public.profiles for insert

  with check (auth.uid() = id);



drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"

  on public.profiles for update

  using (auth.uid() = id);



-- 1.2 CONNECTIONS 表（关注/连接关系）

create table if not exists public.connections (

  id bigint primary key generated always as identity,

  follower_id uuid not null references auth.users(id) on delete cascade,

  following_id uuid not null references auth.users(id) on delete cascade,

  created_at timestamptz default now() not null,

  unique(follower_id, following_id),

  check (follower_id != following_id)

);



create index if not exists idx_connections_follower on public.connections(follower_id);

create index if not exists idx_connections_following on public.connections(following_id);



alter table public.connections enable row level security;



drop policy if exists "Users can view connections" on public.connections;
create policy "Users can view connections"

  on public.connections for select

  using (true);



drop policy if exists "Users can create own connections" on public.connections;
create policy "Users can create own connections"

  on public.connections for insert

  with check (auth.uid() = follower_id);



drop policy if exists "Users can delete own connections" on public.connections;
create policy "Users can delete own connections"

  on public.connections for delete

  using (auth.uid() = follower_id);



-- 1.3 价值观标签库（50个）

create table if not exists public.value_tags (

  id text primary key,

  label text not null,

  sort_order int default 0

);



insert into public.value_tags (id, label, sort_order) values

  ('open_source', '开源', 1),

  ('privacy_first', '隐私优先', 2),

  ('decentralization', '去中心化', 3),

  ('innovation', '创新', 4),

  ('collaboration', '协作', 5),

  ('lifelong_learning', '终身学习', 6),

  ('authenticity', '真实', 7),

  ('sustainability', '可持续发展', 8),

  ('user_experience', '用户体验', 9),

  ('transparency', '透明', 10),

  ('community', '社区', 11),

  ('creativity', '创造力', 12),

  ('independence', '独立', 13),

  ('quality', '质量', 14),

  ('simplicity', '简洁', 15),

  ('diversity', '多元', 16),

  ('inclusion', '包容', 17),

  ('growth_mindset', '成长型思维', 18),

  ('impact', '影响力', 19),

  ('ownership', '主人翁精神', 20),

  ('experimentation', '实验精神', 21),

  ('feedback', '反馈驱动', 22),

  ('remote_first', '远程优先', 23),

  ('async', '异步协作', 24),

  ('knowledge_sharing', '知识共享', 25),

  ('mentorship', '导师精神', 26),

  ('balance', '工作生活平衡', 27),

  ('minimalism', '极简主义', 28),

  ('systematic', '系统化思考', 29),

  ('data_driven', '数据驱动', 30),

  ('human_centric', '以人为本', 31),

  ('anti_growth_hacking', '反增长黑客', 32),

  ('slow_is_fast', '慢即是快', 33),

  ('trust', '信任', 34),

  ('integrity', '正直', 35),

  ('curiosity', '好奇心', 36),

  ('empathy', '同理心', 37),

  ('resilience', '韧性', 38),

  ('adaptability', '适应力', 39),

  ('critical_thinking', '批判性思维', 40),

  ('first_principles', '第一性原理', 41),

  ('long_term', '长期主义', 42),

  ('anti_speculation', '反投机', 43),

  ('builder', '建设者', 44),

  ('explorer', '探索者', 45),

  ('connector', '连接者', 46),

  ('creator', '创造者', 47),

  ('thinker', '思考者', 48),

  ('doer', '行动派', 49),

  ('learner', '学习者', 50)

on conflict (id) do nothing;



alter table public.value_tags enable row level security;

drop policy if exists "Value tags are publicly readable" on public.value_tags;
create policy "Value tags are publicly readable"

  on public.value_tags for select using (true);



-- 1.4 兴趣标签库（50个）

create table if not exists public.interest_tags (

  id text primary key,

  label text not null,

  category text,

  sort_order int default 0

);



insert into public.interest_tags (id, label, category, sort_order) values

  ('web3', 'Web3', 'tech', 1),

  ('product_design', '产品设计', 'design', 2),

  ('writing', '写作', 'creative', 3),

  ('philosophy', '哲学', 'thinking', 4),

  ('psychology', '心理学', 'human', 5),

  ('ai', 'AI', 'tech', 6),

  ('blockchain', '区块链', 'tech', 7),

  ('ux_design', 'UX设计', 'design', 8),

  ('open_source', '开源', 'tech', 9),

  ('community', '社区运营', 'social', 10),

  ('startup', '创业', 'business', 11),

  ('investing', '投资', 'finance', 12),

  ('research', '研究', 'academic', 13),

  ('education', '教育', 'social', 14),

  ('content_creation', '内容创作', 'creative', 15),

  ('podcast', '播客', 'media', 16),

  ('video', '视频', 'media', 17),

  ('music', '音乐', 'creative', 18),

  ('art', '艺术', 'creative', 19),

  ('reading', '阅读', 'learning', 20),

  ('meditation', '冥想', 'wellness', 21),

  ('fitness', '健身', 'wellness', 22),

  ('travel', '旅行', 'lifestyle', 23),

  ('cooking', '烹饪', 'lifestyle', 24),

  ('photography', '摄影', 'creative', 25),

  ('coding', '编程', 'tech', 26),

  ('devops', 'DevOps', 'tech', 27),

  ('data_science', '数据科学', 'tech', 28),

  ('design_systems', '设计系统', 'design', 29),

  ('accessibility', '无障碍设计', 'design', 30),

  ('dao', 'DAO', 'web3', 31),

  ('defi', 'DeFi', 'web3', 32),

  ('nft', 'NFT', 'web3', 33),

  ('identity', '去中心化身份', 'web3', 34),

  ('governance', '治理', 'web3', 35),

  ('social_impact', '社会影响', 'social', 36),

  ('sustainability', '可持续', 'social', 37),

  ('mental_health', '心理健康', 'wellness', 38),

  ('productivity', '效率', 'work', 39),

  ('remote_work', '远程工作', 'work', 40),

  ('management', '管理', 'business', 41),

  ('marketing', '营销', 'business', 42),

  ('sales', '销售', 'business', 43),

  ('legal', '法律', 'professional', 44),

  ('finance', '金融', 'finance', 45),

  ('crypto', '加密货币', 'web3', 46),

  ('gaming', '游戏', 'entertainment', 47),

  ('film', '电影', 'entertainment', 48),

  ('literature', '文学', 'creative', 49),

  ('history', '历史', 'academic', 50)

on conflict (id) do nothing;



alter table public.interest_tags enable row level security;

drop policy if exists "Interest tags are publicly readable" on public.interest_tags;
create policy "Interest tags are publicly readable"

  on public.interest_tags for select using (true);



-- ============================================================

-- ██  第二部分：邀请系统 — invites 表 + RPC 函数

-- ============================================================



-- 2.1 INVITES 表

create table if not exists public.invites (

  id uuid primary key default gen_random_uuid(),

  code text unique not null,

  issuer_id uuid not null references auth.users(id) on delete cascade,

  used_by uuid references auth.users(id) on delete set null,

  used_at timestamptz,

  expires_at timestamptz not null default (now() + interval '30 days'),

  created_at timestamptz default now() not null

);



create index if not exists idx_invites_code on public.invites(code);

create index if not exists idx_invites_issuer on public.invites(issuer_id);



alter table public.invites enable row level security;



drop policy if exists "Users can view own invites" on public.invites;
create policy "Users can view own invites"

  on public.invites for select

  using (auth.uid() = issuer_id);



drop policy if exists "Users can create own invites" on public.invites;
create policy "Users can create own invites"

  on public.invites for insert

  with check (auth.uid() = issuer_id);



-- 2.2 RPC: validate_invite — 校验邀请码是否有效

create or replace function public.validate_invite(p_code text)

returns table (valid boolean, issuer_id uuid, expires_at timestamptz)

language plpgsql security definer as $$

begin

  return query

  select

    (i.used_by is null and i.expires_at > now()) as valid,

    i.issuer_id,

    i.expires_at

  from public.invites i

  where i.code = p_code;

end;

$$;



-- 2.3 RPC: consume_invite — 消耗邀请码

create or replace function public.consume_invite(p_code text, p_user_id uuid)

returns boolean

language plpgsql security definer as $$

declare

  v_invite invites%rowtype;

begin

  select * into v_invite from public.invites where code = p_code for update;

  if v_invite.id is null or v_invite.used_by is not null or v_invite.expires_at <= now() then

    return false;

  end if;

  update public.invites set used_by = p_user_id, used_at = now() where id = v_invite.id;

  return true;

end;

$$;



-- 2.4 RPC: generate_invite — 生成邀请码

create or replace function public.generate_invite(p_issuer_id uuid)

returns text

language plpgsql security definer as $$

declare

  v_new_code text;

  v_quota int;

begin

  select invite_quota into v_quota from public.profiles where id = p_issuer_id;

  if v_quota <= 0 then

    raise exception 'No invite quota remaining';

  end if;

  loop

    v_new_code := upper(encode(gen_random_bytes(4), 'hex'));

    exit when not exists (select 1 from public.invites where code = v_new_code);

  end loop;

  insert into public.invites (code, issuer_id) values (v_new_code, p_issuer_id);

  update public.profiles set invite_quota = invite_quota - 1 where id = p_issuer_id;

  return v_new_code;

end;

$$;



-- 2.5 种子邀请码（开发环境用，上线后删除）

-- REPLACE_WITH_FIRST_USER_UUID 需替换为 Supabase Auth 中首个用户的 uuid

-- insert into public.invites (code, issuer_id, expires_at)

-- values ('DEMO0001', 'REPLACE_WITH_FIRST_USER_UUID'::uuid, now() + interval '30 days')

-- on conflict (code) do nothing;



-- ============================================================

-- ██  第三部分：新用户自动处理 — 触发器

-- ============================================================



-- 3.1 handle_new_user_invite: 注册时自动创建 profile + 消费邀请码（兜底）

create or replace function public.handle_new_user_invite()

returns trigger

language plpgsql

security definer

as $$

declare

  v_code text;

begin

  v_code := (new.raw_user_meta_data->>'invite_code');

  if v_code is not null and v_code <> '' then

    begin

      perform public.consume_invite(v_code, new.id);

    exception

      when others then null;

    end;

  end if;



  insert into public.profiles (id, username)

  values (

    new.id,

    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))

  )

  on conflict (id) do nothing;



  return new;

end;

$$;



drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created

  after insert on auth.users

  for each row execute procedure public.handle_new_user_invite();



-- ============================================================

-- ██  第四部分：Storage — avatars bucket + RLS

-- ============================================================



-- 4.1 创建 avatars bucket（public）

insert into storage.buckets (id, name, public)

values ('avatars', 'avatars', true)

on conflict (id) do nothing;



-- 4.2 Storage RLS 策略

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"

  on storage.objects for select

  using (bucket_id = 'avatars');



drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"

  on storage.objects for insert

  with check (

    bucket_id = 'avatars' and

    auth.uid()::text = (storage.foldername(name))[1]

  );



drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"

  on storage.objects for update

  using (

    bucket_id = 'avatars' and

    auth.uid()::text = (storage.foldername(name))[1]

  );



-- ============================================================

-- ██  第五部分：配额系统 — 防刷滥用（非付费墙）

-- ============================================================



-- 5.1 配额使用记录表

create table if not exists public.quota_usage (

  id bigserial primary key,

  user_id uuid not null references auth.users(id) on delete cascade,

  resource_type text not null check (resource_type in ('discover', 'view_profile', 'follow', 'search', 'create_proposal', 'vote')),

  usage_date date not null default current_date,

  count int not null default 1,

  created_at timestamptz not null default now(),

  unique (user_id, resource_type, usage_date)

);



-- 5.2 配额限制配置

create table if not exists public.quota_limits (

  tier text primary key check (tier in ('free', 'basic', 'pro')),

  discover_daily int not null default 50,

  view_profile_daily int not null default 100,

  follow_daily int not null default 30,

  search_daily int not null default 30,

  create_proposal_daily int not null default 0,

  vote_daily int not null default 0,

  updated_at timestamptz not null default now()

);



insert into public.quota_limits (tier, discover_daily, view_profile_daily, follow_daily, search_daily, create_proposal_daily, vote_daily)

values

  ('free',  50, 100, 30, 30, 0, 0),

  ('basic', 500, 999999, 200, 200, 3, 20),

  ('pro',   999999, 999999, 999999, 999999, 10, 999999)

on conflict (tier) do nothing;



-- 5.3 索引

create index if not exists idx_quota_usage_user_date on public.quota_usage(user_id, usage_date);

create index if not exists idx_quota_usage_lookup on public.quota_usage(user_id, resource_type, usage_date);



-- 5.4 RLS

alter table public.quota_usage enable row level security;

alter table public.quota_limits enable row level security;



drop policy if exists "quota_usage_select_own" on public.quota_usage;
create policy "quota_usage_select_own" on public.quota_usage

  for select using (auth.uid() = user_id);

drop policy if exists "quota_usage_insert_own" on public.quota_usage;
create policy "quota_usage_insert_own" on public.quota_usage

  for insert with check (auth.uid() = user_id);

drop policy if exists "quota_limits_public_read" on public.quota_limits;
create policy "quota_limits_public_read" on public.quota_limits

  for select using (true);



-- 5.5 RPC: check_and_consume_quota — 防刷配额检查+扣减

create or replace function public.check_and_consume_quota(

  p_user_id uuid,

  p_resource_type text

) returns jsonb

language plpgsql security definer

as $$

declare

  v_tier text;

  v_limit int;

  v_used int;

  v_date date := current_date;

begin

  select tier into v_tier from public.user_tiers where user_id = p_user_id;

  if v_tier is null then v_tier := 'free'; end if;



  select case p_resource_type

    when 'discover' then discover_daily

    when 'view_profile' then view_profile_daily

    when 'follow' then follow_daily

    when 'search' then search_daily

    when 'create_proposal' then create_proposal_daily

    when 'vote' then vote_daily

  end into v_limit

  from public.quota_limits where tier = v_tier;



  if v_limit is null then v_limit := 50; end if;

  if v_limit >= 999999 then

    return jsonb_build_object('allowed', true, 'tier', v_tier, 'remaining', 999999, 'purpose', 'anti_abuse');

  end if;



  select coalesce(sum(count), 0) into v_used

  from public.quota_usage

  where user_id = p_user_id and resource_type = p_resource_type and usage_date = v_date;



  if v_used >= v_limit then

    return jsonb_build_object('allowed', false, 'tier', v_tier, 'limit', v_limit, 'used', v_used, 'remaining', 0, 'purpose', 'anti_abuse');

  end if;



  insert into public.quota_usage (user_id, resource_type, usage_date, count)

  values (p_user_id, p_resource_type, v_date, 1)

  on conflict (user_id, resource_type, usage_date)

  do update set count = quota_usage.count + 1;



  return jsonb_build_object('allowed', true, 'tier', v_tier, 'limit', v_limit, 'used', v_used + 1, 'remaining', v_limit - v_used - 1, 'purpose', 'anti_abuse');

end;

$$;



-- 5.6 RPC: get_quota_remaining — 查询剩余配额

create or replace function public.get_quota_remaining(

  p_user_id uuid,

  p_resource_type text

) returns jsonb

language plpgsql security definer

as $$

declare

  v_tier text;

  v_limit int;

  v_used int;

begin

  select tier into v_tier from public.user_tiers where user_id = p_user_id;

  if v_tier is null then v_tier := 'free'; end if;



  select case p_resource_type

    when 'discover' then discover_daily

    when 'view_profile' then view_profile_daily

    when 'follow' then follow_daily

    when 'search' then search_daily

    when 'create_proposal' then create_proposal_daily

    when 'vote' then vote_daily

  end into v_limit

  from public.quota_limits where tier = v_tier;



  if v_limit is null then v_limit := 50; end if;

  if v_limit >= 999999 then

    return jsonb_build_object('tier', v_tier, 'limit', 999999, 'used', 0, 'remaining', 999999);

  end if;



  select coalesce(sum(count), 0) into v_used

  from public.quota_usage

  where user_id = p_user_id and resource_type = p_resource_type and usage_date = current_date;



  return jsonb_build_object('tier', v_tier, 'limit', v_limit, 'used', v_used, 'remaining', v_limit - v_used);

end;

$$;



-- ============================================================

-- ██  第六部分：声誉系统 + 徽章（链下 V1，参考 Genzer）

-- ============================================================



-- 6.1 用户档位表（扩展 user_tiers）

create table if not exists public.user_tiers (

  user_id uuid primary key references auth.users(id) on delete cascade,

  tier text not null default 'free' check (tier in ('free', 'basic', 'pro')),

  reputation_score int not null default 0,

  contribution_points int not null default 0,

  governance_weight numeric(5,2) not null

    generated always as (

      round(reputation_score * 0.6 + contribution_points * 0.4, 2)

    ) stored,

  updated_at timestamptz not null default now()

);



-- 6.2 声誉事件记录表

create table if not exists public.reputation_events (

  id bigserial primary key,

  user_id uuid not null references auth.users(id) on delete cascade,

  action_type text not null check (action_type in (

    'complete_profile', 'receive_follow', 'consensus_match', 'invite_register',

    'create_content', 'host_activity', 'participate_gov', 'absent', 'report_confirmed'

  )),

  points int not null,

  reference_id text,

  created_at timestamptz not null default now()

);



-- 6.3 声誉分值配置

create table if not exists public.reputation_point_config (

  action_type text primary key,

  points int not null,

  daily_limit int not null default 999999,

  description text

);



insert into public.reputation_point_config (action_type, points, daily_limit, description) values

  ('complete_profile',   50,  1,  '完善名片（一次性）'),

  ('receive_follow',      5,  50, '被关注'),

  ('consensus_match',    10,  20, '共识匹配'),

  ('invite_register',   100,   5, '邀请注册成功'),

  ('create_content',     20,  10, '创建内容'),

  ('host_activity',     200,   3, '组织活动'),

  ('participate_gov',    30,  10, '参与治理投票'),

  ('absent',            -50,   3, '缺席（扣分）'),

  ('report_confirmed', -100,   3, '举报核实（扣分）')

on conflict (action_type) do nothing;



-- 6.4 SBT 勋章表

create table if not exists public.badges (

  id bigserial primary key,

  user_id uuid not null references auth.users(id) on delete cascade,

  badge_type text not null check (badge_type in ('activity', 'contributor', 'level', 'special')),

  badge_tier text,

  metadata jsonb not null default '{}',

  earned_at timestamptz not null default now(),

  unique (user_id, badge_type, badge_tier)

);



-- 6.5 等级徽章阈值表

create table if not exists public.badge_level_thresholds (

  level text primary key,

  min_reputation int not null,

  label text not null

);



insert into public.badge_level_thresholds (level, min_reputation, label) values

  ('lv1',   100,   'Lv1 新人'),

  ('lv2',   300,   'Lv2 参与者'),

  ('lv3',   600,   'Lv3 活跃者'),

  ('lv4',   1000,  'Lv4 贡献者'),

  ('lv5',   2000,  'Lv5 核心贡献者'),

  ('lv6',   5000,  'Lv6 社区达人'),

  ('lv7',   10000, 'Lv7 社区领袖'),

  ('lv8',   25000, 'Lv8 治理委员'),

  ('lv9',   50000, 'Lv9 仲裁者'),

  ('lv10',  100000,'Lv10 创始共识者')

on conflict (level) do nothing;



-- 6.6 索引

create index if not exists idx_reputation_events_user on public.reputation_events(user_id, created_at desc);

create index if not exists idx_badges_user on public.badges(user_id, badge_type);



-- 6.7 RLS

alter table public.user_tiers enable row level security;

alter table public.reputation_events enable row level security;

alter table public.reputation_point_config enable row level security;

alter table public.badges enable row level security;

alter table public.badge_level_thresholds enable row level security;



drop policy if exists "user_tiers_select_own" on public.user_tiers;
create policy "user_tiers_select_own" on public.user_tiers

  for select using (auth.uid() = user_id);

drop policy if exists "user_tiers_upsert_own" on public.user_tiers;
create policy "user_tiers_upsert_own" on public.user_tiers

  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);



drop policy if exists "reputation_events_select_own" on public.reputation_events;
create policy "reputation_events_select_own" on public.reputation_events

  for select using (auth.uid() = user_id);



drop policy if exists "reputation_config_public_read" on public.reputation_point_config;
create policy "reputation_config_public_read" on public.reputation_point_config

  for select using (true);



drop policy if exists "badges_select_all" on public.badges;
create policy "badges_select_all" on public.badges

  for select using (true);



drop policy if exists "badge_thresholds_public_read" on public.badge_level_thresholds;
create policy "badge_thresholds_public_read" on public.badge_level_thresholds

  for select using (true);



-- 6.8 RPC: record_reputation_event — 记录声誉事件 + 自动升级徽章

create or replace function public.record_reputation_event(

  p_user_id uuid,

  p_action_type text,

  p_reference_id text default null

) returns jsonb

language plpgsql security definer

as $$

declare

  v_points int;

  v_daily_limit int;

  v_today_count int;

  v_new_score int;

  v_new_badge_level text;

begin

  select points, daily_limit into v_points, v_daily_limit

  from public.reputation_point_config where action_type = p_action_type;



  if v_points is null then

    return jsonb_build_object('success', false, 'error', 'unknown_action_type');

  end if;



  select count(*) into v_today_count

  from public.reputation_events

  where user_id = p_user_id

    and action_type = p_action_type

    and created_at >= current_date;



  if v_today_count >= v_daily_limit then

    v_points := v_points / 10;

  end if;



  insert into public.reputation_events (user_id, action_type, points, reference_id)

  values (p_user_id, p_action_type, v_points, p_reference_id);



  insert into public.user_tiers (user_id, reputation_score)

  values (p_user_id, greatest(0, v_points))

  on conflict (user_id) do update

  set reputation_score = greatest(0, public.user_tiers.reputation_score + v_points),

      updated_at = now();



  select reputation_score into v_new_score

  from public.user_tiers where user_id = p_user_id;



  select level into v_new_badge_level

  from public.badge_level_thresholds

  where min_reputation <= v_new_score

  order by min_reputation desc limit 1;



  if v_new_badge_level is not null then

    insert into public.badges (user_id, badge_type, badge_tier, metadata)

    values (p_user_id, 'level', v_new_badge_level, jsonb_build_object('reputation', v_new_score))

    on conflict (user_id, badge_type, badge_tier) do nothing;

  end if;



  return jsonb_build_object(

    'success', true,

    'points_earned', v_points,

    'new_reputation', v_new_score,

    'badge_upgrade', v_new_badge_level,

    'was_throttled', v_today_count >= v_daily_limit

  );

end;

$$;



-- 6.9 RPC: get_reputation_overview — 查询用户声誉概览

create or replace function public.get_reputation_overview(

  p_user_id uuid

) returns jsonb

language plpgsql security definer

as $$

declare

  v_score int;

  v_contribution int;

  v_gov_weight numeric;

  v_tier text;

  v_badges jsonb;

begin

  select reputation_score, contribution_points, governance_weight, tier

  into v_score, v_contribution, v_gov_weight, v_tier

  from public.user_tiers where user_id = p_user_id;



  if v_score is null then

    return jsonb_build_object('reputation_score', 0, 'contribution_points', 0, 'governance_weight', 0, 'tier', 'free', 'badges', '[]'::jsonb);

  end if;



  select coalesce(jsonb_agg(jsonb_build_object(

    'type', badge_type,

    'tier', badge_tier,

    'earned_at', earned_at

  )), '[]'::jsonb) into v_badges

  from public.badges where user_id = p_user_id;



  return jsonb_build_object(

    'reputation_score', v_score,

    'contribution_points', v_contribution,

    'governance_weight', v_gov_weight,

    'tier', v_tier,

    'badges', v_badges,

    'can_govern', v_tier in ('basic', 'pro')

  );

end;

$$;



-- ============================================================

-- ██  第七部分：治理系统 — 提案 + 投票

-- ============================================================



-- 7.1 治理提案表

create table if not exists public.governance_proposals (

  id bigserial primary key,

  proposer_id uuid not null references auth.users(id) on delete cascade,

  title text not null,

  description text not null,

  proposal_type text not null check (proposal_type in ('feature', 'config_change', 'community_rule', 'funding', 'other')),

  status text not null default 'voting' check (status in ('voting', 'passed', 'rejected', 'executed', 'cancelled')),

  voting_ends_at timestamptz not null,

  execution_data jsonb not null default '{}',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);



-- 7.2 治理投票表

create table if not exists public.governance_votes (

  id bigserial primary key,

  proposal_id bigint not null references public.governance_proposals(id) on delete cascade,

  voter_id uuid not null references auth.users(id) on delete cascade,

  vote text not null check (vote in ('for', 'against', 'abstain')),

  weight numeric(5,2) not null default 1.00,

  created_at timestamptz not null default now(),

  unique (proposal_id, voter_id)

);



-- 7.3 索引

create index if not exists idx_proposals_status on public.governance_proposals(status, created_at desc);

create index if not exists idx_votes_proposal on public.governance_votes(proposal_id);



-- 7.4 RLS

alter table public.governance_proposals enable row level security;

alter table public.governance_votes enable row level security;



drop policy if exists "proposals_select_all" on public.governance_proposals;
create policy "proposals_select_all" on public.governance_proposals

  for select using (true);

drop policy if exists "proposals_insert_paid" on public.governance_proposals;
create policy "proposals_insert_paid" on public.governance_proposals

  for insert with check (

    auth.uid() = proposer_id

    and exists (select 1 from public.user_tiers where user_id = auth.uid() and tier in ('basic', 'pro'))

  );

drop policy if exists "proposals_update_own" on public.governance_proposals;
create policy "proposals_update_own" on public.governance_proposals

  for update using (auth.uid() = proposer_id);



drop policy if exists "votes_select_all" on public.governance_votes;
create policy "votes_select_all" on public.governance_votes

  for select using (true);

drop policy if exists "votes_insert_paid" on public.governance_votes;
create policy "votes_insert_paid" on public.governance_votes

  for insert with check (

    auth.uid() = voter_id

    and exists (select 1 from public.user_tiers where user_id = auth.uid() and tier in ('basic', 'pro'))

  );



-- 7.5 RPC: cast_governance_vote — 治理投票

create or replace function public.cast_governance_vote(

  p_proposal_id bigint,

  p_voter_id uuid,

  p_vote text

) returns jsonb

language plpgsql security definer

as $$

declare

  v_tier text;

  v_weight numeric;

  v_proposal_status text;

  v_ends_at timestamptz;

begin

  select tier into v_tier from public.user_tiers where user_id = p_voter_id;

  if v_tier not in ('basic', 'pro') then

    return jsonb_build_object('success', false, 'error', 'governance_requires_paid_tier');

  end if;



  select status, voting_ends_at into v_proposal_status, v_ends_at

  from public.governance_proposals where id = p_proposal_id;



  if v_proposal_status is null then

    return jsonb_build_object('success', false, 'error', 'proposal_not_found');

  end if;

  if v_proposal_status != 'voting' then

    return jsonb_build_object('success', false, 'error', 'proposal_not_in_voting');

  end if;

  if now() > v_ends_at then

    return jsonb_build_object('success', false, 'error', 'voting_ended');

  end if;



  select governance_weight into v_weight

  from public.user_tiers where user_id = p_voter_id;

  if v_weight is null or v_weight = 0 then

    v_weight := 1.00;

  end if;



  insert into public.governance_votes (proposal_id, voter_id, vote, weight)

  values (p_proposal_id, p_voter_id, p_vote, v_weight)

  on conflict (proposal_id, voter_id)

  do update set vote = p_vote, weight = v_weight;



  perform public.record_reputation_event(p_voter_id, 'participate_gov', p_proposal_id::text);



  return jsonb_build_object(

    'success', true,

    'vote', p_vote,

    'weight', v_weight,

    'contribution_earned', 30

  );

end;

$$;



-- ============================================================

-- ██  第八部分：Trust FSS 0.1 — 可选审计表

-- ============================================================



create table if not exists public.trust_fss_records (

  id bigserial primary key,

  record_id uuid not null unique,

  subject_kind text not null,

  subject_id text not null,

  functional_status text not null check (

    functional_status in ('normal', 'no_data', 'no_computed', 'functional_test')

  ),

  data_set_digest text not null,

  evidence_refs jsonb not null default '[]',

  verifier_id text not null,

  rule_version text not null,

  detail text,

  raw_response jsonb not null default '{}',

  created_at timestamptz not null default now()

);



create index if not exists idx_trust_fss_records_subject

  on public.trust_fss_records (subject_kind, subject_id, created_at desc);



alter table public.trust_fss_records enable row level security;



drop policy if exists "trust_fss_records_select_authenticated" on public.trust_fss_records;
create policy "trust_fss_records_select_authenticated"

  on public.trust_fss_records

  for select

  to authenticated

  using (true);



-- ============================================================

-- ✅ 全部完成！

-- 下一步：在 Supabase Dashboard → Settings → Auth 中:

--   - Email provider: ON, Confirm email: OFF（开发阶段）

--   - 或配置自定义 SMTP 后开启 Confirm email

-- ============================================================
