-- ============================================================
-- Genzer Terminal 数据库验证 SQL
-- 在跑完 genzer_terminal_init_v1.0.sql 后执行
-- 有任何 FAIL 就说明有问题
-- ============================================================

-- 1. 检查所有表是否已创建
select '=== 1. 表检查 ===' as step;

select
  table_name,
  case when exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = t.table_name
  ) then '✅ OK' else '❌ 缺失' end as status
from (values
  ('profiles'),
  ('connections'),
  ('value_tags'),
  ('interest_tags'),
  ('invites'),
  ('user_tiers'),
  ('quota_usage'),
  ('quota_limits'),
  ('reputation_events'),
  ('reputation_point_config'),
  ('badges'),
  ('badge_level_thresholds'),
  ('governance_proposals'),
  ('governance_votes'),
  ('trust_fss_records')
) as t(table_name);


-- 2. 检查 RLS 是否已启用
select '=== 2. RLS 检查 ===' as step;

select
  t.table_name,
  case when c.relrowsecurity then '✅ 启用' else '❌ 未启用' end as rls_status
from (values
  ('profiles'),
  ('connections'),
  ('value_tags'),
  ('interest_tags'),
  ('invites'),
  ('quota_usage'),
  ('quota_limits'),
  ('user_tiers'),
  ('reputation_events'),
  ('reputation_point_config'),
  ('badges'),
  ('badge_level_thresholds'),
  ('governance_proposals'),
  ('governance_votes'),
  ('trust_fss_records')
) as t(table_name)
left join pg_class c on c.relname = t.table_name and c.relnamespace = (select oid from pg_namespace where nspname = 'public')
order by t.table_name;


-- 3. 检查 RPC 函数是否已创建（应有 9 个）
select '=== 3. RPC 函数检查 ===' as step;

select routine_name as function_name,
  '✅ OK' as status
from information_schema.routines
where routine_schema = 'public'
  and routine_type = 'FUNCTION'
  and routine_name in (
    'validate_invite','consume_invite','generate_invite',
    'check_and_consume_quota','get_quota_remaining',
    'record_reputation_event','get_reputation_overview',
    'cast_governance_vote','handle_new_user_invite'
  )
order by routine_name;


-- 4. 检查触发器 on_auth_user_created 是否存在
select '=== 4. 触发器检查 ===' as step;

select
  trigger_name,
  event_object_table as table_name,
  '✅ OK' as status
from information_schema.triggers
where trigger_schema = 'auth'
  and trigger_name = 'on_auth_user_created';


-- 5. 检查种子数据（value_tags / interest_tags / quota_limits / reputation_point_config / badge_level_thresholds）
select '=== 5. 种子数据检查 ===' as step;

select 'value_tags' as table_name, count(*) as row_count,
  case when count(*) = 50 then '✅ 50条' else '❌ 数量不对' end as status
from public.value_tags
union all
select 'interest_tags', count(*),
  case when count(*) = 50 then '✅ 50条' else '❌ 数量不对' end
from public.interest_tags
union all
select 'quota_limits', count(*),
  case when count(*) = 3 then '✅ 3条' else '❌ 数量不对' end
from public.quota_limits
union all
select 'reputation_point_config', count(*),
  case when count(*) = 9 then '✅ 9条' else '❌ 数量不对' end
from public.reputation_point_config
union all
select 'badge_level_thresholds', count(*),
  case when count(*) = 10 then '✅ 10级' else '❌ 数量不对' end
from public.badge_level_thresholds;


-- 6. 检查 Storage bucket avatars 是否存在
select '=== 6. Storage Bucket 检查 ===' as step;

select id as bucket_name,
  case when public then '✅ public' else '⚠️ private' end as status
from storage.buckets
where id = 'avatars';


-- 7. 检查 user_tiers 的 governance_weight 生成列
select '=== 7. user_tiers.governance_weight 检查 ===' as step;

select
  column_name,
  is_generated,
  generation_expression
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_tiers'
  and column_name = 'governance_weight';


select '=== ✅ 验证完成！以上有任何 ❌ 请截图给我 ===' as result;
