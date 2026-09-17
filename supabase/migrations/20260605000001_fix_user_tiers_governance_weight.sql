-- ============================================================
-- 修复 user_tiers.governance_weight 列：添加 not null + default
-- 对齐 genzer_terminal_init_v1.0.sql 定义
-- ============================================================

-- generated always as 列不能直接 ALTER ... SET DEFAULT，
-- 但可以添加 NOT NULL 约束（生成列本身已隐含 not-null 语义）
-- 这里仅补充 NOT NULL 约束以保持定义一致性
alter table public.user_tiers
  alter column governance_weight set not null;
