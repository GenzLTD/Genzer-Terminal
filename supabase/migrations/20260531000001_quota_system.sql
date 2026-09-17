-- ============================================================
-- Genzer Terminal 社区自治基础设施 V1
-- 核心理念：配额仅防刷，治理权才是免费/付费的核心差异
-- 参考：genzer-contracts（GenzBadge + GenzReputation）
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 一、用户档位表（扩展：加入治理相关字段）
-- ════════════════════════════════════════════════════════════
create table if not exists public.user_tiers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'basic', 'pro')),
  reputation_score int not null default 0,
  contribution_points int not null default 0,
  governance_weight numeric(5,2)
    generated always as (
      round(reputation_score * 0.6 + contribution_points * 0.4, 2)
    ) stored,
  updated_at timestamptz not null default now()
);

comment on table public.user_tiers is '用户档位与治理权重：free=社区成员，basic/pro=治理参与者';
comment on column public.user_tiers.reputation_score is '链下声誉分（参考 Genzer GenzReputation）';
comment on column public.user_tiers.contribution_points is '贡献积分（治理参与、内容贡献等）';
comment on column public.user_tiers.governance_weight is '治理投票权重 = 声誉分×60% + 贡献积分×40%（自动计算）';

-- ════════════════════════════════════════════════════════════
-- 二、配额使用记录表（定位：防刷滥用，不是付费墙）
-- 配额限制大幅放宽，仅防止机器人刷接口
-- ════════════════════════════════════════════════════════════
create table if not exists public.quota_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('discover', 'view_profile', 'follow', 'search', 'create_proposal', 'vote')),
  usage_date date not null default current_date,
  count int not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, resource_type, usage_date)
);

comment on table public.quota_usage is '防刷配额记录（非付费墙，仅防机器人滥用）';

-- 配额限制配置（大幅放宽，免费用户也有充足使用量）
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

comment on table public.quota_limits is '防刷配额限制（非付费墙，免费版配额已足够正常使用）';

insert into public.quota_limits (tier, discover_daily, view_profile_daily, follow_daily, search_daily, create_proposal_daily, vote_daily)
values
  ('free',  50, 100, 30, 30, 0, 0),
  ('basic', 500, 999999, 200, 200, 3, 20),
  ('pro',   999999, 999999, 999999, 999999, 10, 999999)
on conflict (tier) do nothing;

-- ════════════════════════════════════════════════════════════
-- 三、多维声誉事件表（参考 Genzer GenzReputation 的7种行为）
-- ════════════════════════════════════════════════════════════
create table if not exists public.reputation_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null check (action_type in (
    'complete_profile',    -- 完善名片 +50
    'receive_follow',      -- 被关注 +5
    'consensus_match',     -- 共识匹配 +10
    'invite_register',     -- 邀请注册 +100
    'create_content',      -- 创建内容 +20
    'host_activity',       -- 组织活动 +200（预留）
    'participate_gov',     -- 参与治理（投票） +30
    'absent',              -- 负面：缺席 -50
    'report_confirmed'     -- 负面：举报核实 -100
  )),
  points int not null,
  reference_id text,
  created_at timestamptz not null default now()
);

comment on table public.reputation_events is '多维声誉事件记录（参考 Genzer ActionType，链下实现）';
comment on column public.reputation_events.reference_id is '关联对象ID（如邀请码、提案ID等）';

-- 声誉分值配置表（可动态调整）
create table if not exists public.reputation_point_config (
  action_type text primary key,
  points int not null,
  daily_limit int not null default 999999,
  description text
);

comment on table public.reputation_point_config is '声誉行为分值配置（可链上更新）';

insert into public.reputation_point_config (action_type, points, daily_limit, description) values
  ('complete_profile',   50,  1,    '完善名片（一次性）'),
  ('receive_follow',      5,  50,   '被关注'),
  ('consensus_match',    10,  20,   '共识匹配'),
  ('invite_register',   100,   5,   '邀请注册成功'),
  ('create_content',     20,  10,   '创建内容'),
  ('host_activity',     200,   3,   '组织活动'),
  ('participate_gov',    30,  10,   '参与治理投票'),
  ('absent',            -50,   3,   '缺席（扣分）'),
  ('report_confirmed', -100,   3,   '举报核实（扣分）')
on conflict (action_type) do nothing;

-- ════════════════════════════════════════════════════════════
-- 四、SBT 勋章表（参考 Genzer GenzBadge，链下实现 V1）
-- ════════════════════════════════════════════════════════════
create table if not exists public.badges (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_type text not null check (badge_type in (
    'activity',       -- 活动参与勋章
    'contributor',    -- 贡献勋章（铜/银/金）
    'level',          -- 等级徽章（Lv1~Lv10，与声誉值挂钩）
    'special'         -- 特殊勋章
  )),
  badge_tier text,
  metadata jsonb not null default '{}',
  earned_at timestamptz not null default now(),
  unique (user_id, badge_type, badge_tier)
);

comment on table public.badges is 'SBT灵魂绑定勋章（链下V1，不可转让，参考 Genzer GenzBadge）';
comment on column public.badges.badge_tier is '勋章等级：contributor=bronze/silver/gold，level=lv1~lv10';

-- 等级徽章与声誉值的映射（参考 Genzer autoUpgradeLevel）
create table if not exists public.badge_level_thresholds (
  level text primary key,
  min_reputation int not null,
  label text not null
);

comment on table public.badge_level_thresholds is '等级徽章与声誉值阈值映射';

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

-- ════════════════════════════════════════════════════════════
-- 五、治理提案表（仅付费用户可发起）
-- ════════════════════════════════════════════════════════════
create table if not exists public.governance_proposals (
  id bigserial primary key,
  proposer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  proposal_type text not null check (proposal_type in (
    'feature',        -- 功能请求
    'config_change',  -- 配置变更
    'community_rule', -- 社区规则
    'funding',        -- 资金提案
    'other'           -- 其他
  )),
  status text not null default 'voting' check (status in (
    'voting',         -- 投票中
    'passed',         -- 通过
    'rejected',       -- 否决
    'executed',       -- 已执行
    'cancelled'       -- 已取消
  )),
  voting_ends_at timestamptz not null,
  execution_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.governance_proposals is '治理提案（仅付费用户可发起，参考 Genzltd 智能治理引擎）';
comment on column public.governance_proposals.execution_data is '提案通过后的自动执行参数（参考 Genzltd SMART_GOVERNANCE）';

-- ════════════════════════════════════════════════════════════
-- 六、治理投票表（仅付费用户可投票，权重=治理权重）
-- ════════════════════════════════════════════════════════════
create table if not exists public.governance_votes (
  id bigserial primary key,
  proposal_id bigint not null references public.governance_proposals(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  vote text not null check (vote in ('for', 'against', 'abstain')),
  weight numeric(5,2) not null default 1.00,
  created_at timestamptz not null default now(),
  unique (proposal_id, voter_id)
);

comment on table public.governance_votes is '治理投票（仅付费用户可投票，权重=治理权重）';
comment on column public.governance_votes.weight is '投票权重 = 声誉分×60% + 贡献积分×40%（来自 user_tiers.governance_weight）';

-- ════════════════════════════════════════════════════════════
-- 七、索引
-- ════════════════════════════════════════════════════════════
create index if not exists idx_quota_usage_user_date
  on public.quota_usage(user_id, usage_date);
create index if not exists idx_quota_usage_lookup
  on public.quota_usage(user_id, resource_type, usage_date);
create index if not exists idx_reputation_events_user
  on public.reputation_events(user_id, created_at desc);
create index if not exists idx_badges_user
  on public.badges(user_id, badge_type);
create index if not exists idx_proposals_status
  on public.governance_proposals(status, created_at desc);
create index if not exists idx_votes_proposal
  on public.governance_votes(proposal_id);

-- ════════════════════════════════════════════════════════════
-- 八、RLS 策略
-- ════════════════════════════════════════════════════════════
alter table public.user_tiers enable row level security;
alter table public.quota_usage enable row level security;
alter table public.quota_limits enable row level security;
alter table public.reputation_events enable row level security;
alter table public.reputation_point_config enable row level security;
alter table public.badges enable row level security;
alter table public.badge_level_thresholds enable row level security;
alter table public.governance_proposals enable row level security;
alter table public.governance_votes enable row level security;

-- user_tiers
create policy "user_tiers_select_own" on public.user_tiers
  for select using (auth.uid() = user_id);
create policy "user_tiers_upsert_own" on public.user_tiers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- quota_usage
create policy "quota_usage_select_own" on public.quota_usage
  for select using (auth.uid() = user_id);
create policy "quota_usage_insert_own" on public.quota_usage
  for insert with check (auth.uid() = user_id);

-- quota_limits: 公开读取
create policy "quota_limits_public_read" on public.quota_limits
  for select using (true);

-- reputation_events: 自己可读，系统写入
create policy "reputation_events_select_own" on public.reputation_events
  for select using (auth.uid() = user_id);

-- reputation_point_config: 公开读取
create policy "reputation_config_public_read" on public.reputation_point_config
  for select using (true);

-- badges: 自己可读，所有人可查看他人勋章
create policy "badges_select_all" on public.badges
  for select using (true);

-- badge_level_thresholds: 公开读取
create policy "badge_thresholds_public_read" on public.badge_level_thresholds
  for select using (true);

-- governance_proposals: 所有人可读，仅付费用户可创建
create policy "proposals_select_all" on public.governance_proposals
  for select using (true);
create policy "proposals_insert_paid" on public.governance_proposals
  for insert with check (
    auth.uid() = proposer_id
    and exists (select 1 from public.user_tiers where user_id = auth.uid() and tier in ('basic', 'pro'))
  );
create policy "proposals_update_own" on public.governance_proposals
  for update using (auth.uid() = proposer_id);

-- governance_votes: 所有人可读投票结果，仅付费用户可投票
create policy "votes_select_all" on public.governance_votes
  for select using (true);
create policy "votes_insert_paid" on public.governance_votes
  for insert with check (
    auth.uid() = voter_id
    and exists (select 1 from public.user_tiers where user_id = auth.uid() and tier in ('basic', 'pro'))
  );

-- ════════════════════════════════════════════════════════════
-- 九、RPC 函数
-- ════════════════════════════════════════════════════════════

-- 9.1 配额检查+扣减（防刷，非付费墙）
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

comment on function public.check_and_consume_quota(uuid, text) is '防刷配额检查（非付费墙，免费版配额充足）';

-- 9.2 查询剩余配额
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

-- 9.3 记录声誉事件并更新用户声誉分
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
  -- 获取分值配置
  select points, daily_limit into v_points, v_daily_limit
  from public.reputation_point_config where action_type = p_action_type;

  if v_points is null then
    return jsonb_build_object('success', false, 'error', 'unknown_action_type');
  end if;

  -- 防刷：检查每日行为上限（参考 Genzer 降级策略）
  select count(*) into v_today_count
  from public.reputation_events
  where user_id = p_user_id
    and action_type = p_action_type
    and created_at >= current_date;

  if v_today_count >= v_daily_limit then
    -- 超过上限降为 1/10（参考 Genzer 防刷设计）
    v_points := v_points / 10;
  end if;

  -- 插入事件记录
  insert into public.reputation_events (user_id, action_type, points, reference_id)
  values (p_user_id, p_action_type, v_points, p_reference_id);

  -- 更新用户声誉分
  insert into public.user_tiers (user_id, reputation_score)
  values (p_user_id, greatest(0, v_points))
  on conflict (user_id) do update
  set reputation_score = greatest(0, public.user_tiers.reputation_score + v_points),
      updated_at = now();

  -- 检查是否需要升级等级徽章（参考 Genzer autoUpgradeLevel）
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

comment on function public.record_reputation_event(uuid, text, text) is '记录声誉事件并更新用户声誉分+自动升级徽章（参考 Genzer GenzReputation）';

-- 9.4 查询用户声誉概览
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

comment on function public.get_reputation_overview(uuid) is '查询用户声誉概览（声誉分、贡献积分、治理权重、勋章）';

-- 9.5 治理投票（仅付费用户，权重来自 governance_weight）
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
  -- 检查用户档位
  select tier into v_tier from public.user_tiers where user_id = p_voter_id;
  if v_tier not in ('basic', 'pro') then
    return jsonb_build_object('success', false, 'error', 'governance_requires_paid_tier');
  end if;

  -- 检查提案状态
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

  -- 获取治理权重
  select governance_weight into v_weight
  from public.user_tiers where user_id = p_voter_id;

  if v_weight is null or v_weight = 0 then
    v_weight := 1.00; -- 默认权重
  end if;

  -- 插入或更新投票
  insert into public.governance_votes (proposal_id, voter_id, vote, weight)
  values (p_proposal_id, p_voter_id, p_vote, v_weight)
  on conflict (proposal_id, voter_id)
  do update set vote = p_vote, weight = v_weight;

  -- 增加贡献积分（参与治理加分）
  perform public.record_reputation_event(p_voter_id, 'participate_gov', p_proposal_id::text);

  return jsonb_build_object(
    'success', true,
    'vote', p_vote,
    'weight', v_weight,
    'contribution_earned', 30
  );
end;
$$;

comment on function public.cast_governance_vote(bigint, uuid, text) is '治理投票（仅付费用户，权重=治理权重，参与治理自动加贡献分）';
