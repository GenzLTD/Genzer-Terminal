-- ============================================
-- Genzer Terminal — 完整数据库初始化 SQL
-- 在 Supabase SQL Editor 中一次性执行
-- ============================================

-- ============================================
-- 1. PROFILES 表（扩展 auth.users）
-- ============================================
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

create policy if not exists "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy if not exists "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy if not exists "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. CONNECTIONS 表（关注/连接关系）
-- ============================================
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

create policy if not exists "Users can view connections"
  on public.connections for select
  using (true);

create policy if not exists "Users can create own connections"
  on public.connections for insert
  with check (auth.uid() = follower_id);

create policy if not exists "Users can delete own connections"
  on public.connections for delete
  using (auth.uid() = follower_id);

-- ============================================
-- 3. 价值观标签库（50个）
-- ============================================
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
create policy if not exists "Value tags are publicly readable"
  on public.value_tags for select using (true);

-- ============================================
-- 4. 兴趣标签库（50个）
-- ============================================
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
  ('sustainability2', '可持续', 'social', 37),
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
create policy if not exists "Interest tags are publicly readable"
  on public.interest_tags for select using (true);

-- ============================================
-- 5. INVITES 表（邀请码）
-- ============================================
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

create policy if not exists "Users can view own invites"
  on public.invites for select
  using (auth.uid() = issuer_id);

create policy if not exists "Users can create own invites"
  on public.invites for insert
  with check (auth.uid() = issuer_id);

-- ============================================
-- 6. RPC 函数
-- ============================================

-- validate_invite(code)
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

-- consume_invite(code, user_id)
create or replace function public.consume_invite(p_code text, p_user_id uuid)
returns boolean
language plpgsql security definer as $$
declare
  v_invite public.invites%rowtype;
begin
  select * into v_invite from public.invites where code = p_code for update;
  if v_invite.id is null or v_invite.used_by is not null or v_invite.expires_at <= now() then
    return false;
  end if;
  update public.invites set used_by = p_user_id, used_at = now() where id = v_invite.id;
  return true;
end;
$$;

-- generate_invite(issuer_id)
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

-- ============================================
-- 7. STORAGE: avatars bucket + policies
-- ============================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy if not exists "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy if not exists "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 8. AUTO-CONSUME INVITE ON SIGNUP
-- 注册时自动消费邀请码（从 user_metadata.invite_code 读取）
-- 作为客户端 RPC 调用的兜底保障
-- ============================================

create or replace function public.handle_new_user_invite()
returns trigger
language plpgsql
security definer
as $$
declare
  v_code text;
begin
  -- 从 user_metadata 读取邀请码
  v_code := (new.raw_user_meta_data->>'invite_code');

  if v_code is not null and v_code <> '' then
    -- 尝试消费邀请码（失败时静默忽略，不影响注册）
    begin
      perform public.consume_invite(v_code, new.id);
    exception
      when others then
        -- 消费失败不阻断注册，仅记录（可后续手动处理）
        null;
    end;
  end if;

  -- 继续处理 profiles 插入（原 handle_new_user 逻辑）
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 替换原有触发器（如果已存在则先删除）
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_invite();

-- ============================================
-- ✅ 完成！
-- ============================================