# Supabase 数据库文档

项目：Genzer Terminal（Zervi-Genzer 共识网络软件终端 · 前身为 DemoPPI）  
Supabase Project URL：`https://ihuddnluwggbdppheixu.supabase.co`

> **核心理念**：配额仅防刷滥用，治理权才是免费/付费的核心差异化。  
> 参考：[genzer-contracts](https://github.com/xiajason/genzer-contracts)（GenzBadge + GenzReputation）

---

## 迁移文件执行顺序

全新部署时，按以下顺序在 [SQL Editor](https://supabase.com/dashboard/project/ihuddnluwggbdppheixu/sql/new) 执行：

| 顺序 | 文件 | 内容 |
|------|------|------|
| 1 | `migrations/20260220000000_initial_schema.sql` | profiles、connections、value_tags、interest_tags 表 + RLS + trigger |
| 2 | `migrations/20260220000001_storage_avatars.sql` | avatars Storage bucket RLS |
| 3 | `migrations/20260530000000_invites.sql` | invites 表 + validate/consume/generate_invite RPC |
| 4 | `migrations/20260531000000_fixes_and_seed.sql` | 种子邀请码 + Auth 配置说明 |
| 5 | `migrations/20260531000000_quota_system.sql` | 社区自治基础设施：配额防刷 + 声誉系统 + SBT勋章 + 治理提案/投票 |
| 6 | `migrations/20260605000000_trust_fss_records.sql` | Trust FSS 0.1 可选审计表 `trust_fss_records` |
| 7 | `migrations/20260605000001_fix_user_tiers_governance_weight.sql` | `user_tiers.governance_weight` 补 NOT NULL，对齐 `genzer_terminal_init_v1.0.sql` 定义 |

> **注意**：每个函数（`$$...$$`）须在单独的 SQL 窗口执行，避免 Supabase Dashboard 自动注入语句破坏 dollar-quoting。

---

## 免费版 vs 付费版：差异化定位

| 维度 | 免费版（社区成员） | 付费版（治理参与者） |
|------|---------------------|----------------------|
| **核心定位** | 社区的参与者 | 社区的共建者 |
| **身份** | 创建名片、发现同道 | 链上声誉、SBT勋章 |
| **治理权** | 查看提案（只读） | 发起提案、参与投票 |
| **投票权重** | 无 | 声誉×60% + 贡献×40% |
| **配额** | 充足（50发现/100查看/30关注/天） | 更充裕或无限 |
| **AI 能力** | 无 | Tatha AI 匹配/简历解析 |
| **付费动机** | — | "我要有话语权" |

**差异化本质**：不是"能用多少"，而是"能影响多少"。

---

## 数据库表结构

### 基础表

#### `public.profiles`
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键，关联 auth.users(id) |
| username | text | 唯一用户名（注册时从邮箱前缀自动生成） |
| layer0 | jsonb | 公开名片（name/avatar/manifesto/value_tags/interest_tags/city/mbti_type） |
| layer1 | jsonb | 连接后可见的兴趣图谱 |
| layer2 | jsonb | 深度档案（Phase 2） |
| visibility_settings | jsonb | 可见性控制 |
| invite_quota | int | 剩余邀请名额（默认 5） |
| created_at / updated_at | timestamptz | 时间戳 |

#### `public.connections`
| 字段 | 类型 | 说明 |
|------|------|------|
| follower_id | uuid | 关注者 |
| following_id | uuid | 被关注者 |

#### `public.invites`
| 字段 | 类型 | 说明 |
|------|------|------|
| code | text | 8位邀请码（唯一） |
| issuer_id | uuid | 发放者 |
| used_by | uuid | 使用者（null = 未使用） |
| expires_at | timestamptz | 过期时间（默认30天） |

### 社区自治表（参考 genzer-contracts）

#### `public.user_tiers` — 用户档位与治理权重
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | uuid | 主键 |
| tier | text | 档位：free/basic/pro |
| reputation_score | int | 链下声誉分（参考 Genzer GenzReputation） |
| contribution_points | int | 贡献积分 |
| governance_weight | numeric(5,2) | **治理投票权重 = 声誉分×60% + 贡献积分×40%**（自动计算） |

#### `public.quota_usage` — 防刷配额记录
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | uuid | 用户 ID |
| resource_type | text | 资源类型：discover/view_profile/follow/search/create_proposal/vote |
| usage_date | date | 使用日期 |
| count | int | 使用次数 |

#### `public.quota_limits` — 防刷配额限制（免费版已足够正常使用）
| 档位 | discover | view_profile | follow | search | create_proposal | vote |
|------|----------|-------------|--------|--------|----------------|------|
| free | 50/天 | 100/天 | 30/天 | 30/天 | 0 | 0 |
| basic | 500/天 | ∞ | 200/天 | 200/天 | 3/天 | 20/天 |
| pro | ∞ | ∞ | ∞ | ∞ | 10/天 | ∞ |

#### `public.reputation_events` — 多维声誉事件（参考 Genzer ActionType）
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | uuid | 用户 |
| action_type | text | 行为类型（9种：complete_profile/receive_follow/consensus_match/invite_register/create_content/host_activity/participate_gov/absent/report_confirmed） |
| points | int | 获得积分（正/负） |
| reference_id | text | 关联对象ID |

#### `public.reputation_point_config` — 声誉分值配置
| 行为类型 | 分值 | 每日上限 | 说明 |
|----------|------|----------|------|
| complete_profile | +50 | 1次 | 完善名片（一次性） |
| receive_follow | +5 | 50次 | 被关注 |
| consensus_match | +10 | 20次 | 共识匹配 |
| invite_register | +100 | 5次 | 邀请注册成功 |
| create_content | +20 | 10次 | 创建内容 |
| host_activity | +200 | 3次 | 组织活动 |
| participate_gov | +30 | 10次 | 参与治理投票 |
| absent | -50 | 3次 | 缺席（扣分） |
| report_confirmed | -100 | 3次 | 举报核实（扣分） |

> **防刷设计**（参考 Genzer）：超过每日上限后，积分降为 1/10，而非禁止操作。

#### `public.badges` — SBT 灵魂绑定勋章（参考 Genzer GenzBadge）
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | uuid | 用户 |
| badge_type | text | 勋章类型：activity/contributor/level/special |
| badge_tier | text | 勋章等级：contributor=bronze/silver/gold，level=lv1~lv10 |
| metadata | jsonb | 附加数据 |
| earned_at | timestamptz | 获得时间 |

> **灵魂绑定**：SBT 不可转让、不可买卖，代表真实贡献记录。

#### `public.badge_level_thresholds` — 等级徽章与声誉值映射
| 等级 | 最低声誉 | 标签 |
|------|----------|------|
| lv1 | 100 | 新人 |
| lv2 | 300 | 参与者 |
| lv3 | 600 | 活跃者 |
| lv4 | 1,000 | 贡献者 |
| lv5 | 2,000 | 核心贡献者 |
| lv6 | 5,000 | 社区达人 |
| lv7 | 10,000 | 社区领袖 |
| lv8 | 25,000 | 治理委员 |
| lv9 | 50,000 | 仲裁者 |
| lv10 | 100,000 | 创始共识者 |

> **自动升级**（参考 Genzer autoUpgradeLevel）：声誉值变化时，自动检查并升级等级徽章。

#### `public.governance_proposals` — 治理提案（仅付费用户可发起）
| 字段 | 类型 | 说明 |
|------|------|------|
| proposer_id | uuid | 提案人（必须是 basic/pro） |
| title | text | 提案标题 |
| description | text | 提案描述 |
| proposal_type | text | 类型：feature/config_change/community_rule/funding/other |
| status | text | 状态：voting/passed/rejected/executed/cancelled |
| voting_ends_at | timestamptz | 投票截止时间 |
| execution_data | jsonb | 自动执行参数（参考 Genzltd 智能治理引擎） |

#### `public.governance_votes` — 治理投票（仅付费用户，权重=治理权重）
| 字段 | 类型 | 说明 |
|------|------|------|
| proposal_id | bigint | 提案 ID |
| voter_id | uuid | 投票人（必须是 basic/pro） |
| vote | text | 投票：for/against/abstain |
| weight | numeric(5,2) | 投票权重（来自 user_tiers.governance_weight） |

---

## RPC 函数

### 基础函数
| 函数 | 说明 |
|------|------|
| `validate_invite(code)` | 校验邀请码是否有效 |
| `consume_invite(code, user_id)` | 消耗邀请码 |
| `generate_invite(issuer_id)` | 生成新邀请码 |

### 配额函数（防刷，非付费墙）
| 函数 | 说明 |
|------|------|
| `check_and_consume_quota(user_id, resource_type)` | 原子性检查并扣减配额（防刷保护） |
| `get_quota_remaining(user_id, resource_type)` | 查询剩余配额 |

### 声誉函数（参考 Genzer GenzReputation）
| 函数 | 说明 |
|------|------|
| `record_reputation_event(user_id, action_type, reference_id)` | 记录声誉事件，自动更新声誉分+升级勋章 |
| `get_reputation_overview(user_id)` | 查询声誉概览（声誉分/贡献积分/治理权重/勋章/是否可治理） |

### 治理函数（参考 Genzltd 智能治理引擎）
| 函数 | 说明 |
|------|------|
| `cast_governance_vote(proposal_id, voter_id, vote)` | 治理投票（仅付费用户，自动计算权重，参与治理加贡献分） |

---

## 渐进式去中心化路线图（参考 Genzer）

```
Phase 1 (当前) → 声誉 + 勋章 + 治理（链下实现，中心化管理员）
Phase 2        → 链上声誉 + SBT + 治理代币（参考 Genzer Phase 2）
Phase 3        → 质押 + 金库 + 自动执行（参考 Genzer Phase 3 + Genzltd 智能治理）
Phase 4        → 跨链扩展 + DAO 完全自治（参考 Genzer Phase 4）
```

---

## Trigger

`on_auth_user_created`：新用户注册后自动在 `public.profiles` 创建记录，username 默认取邮箱 `@` 前部分。

---

## Auth 配置（Supabase Dashboard）

路径：Settings → Auth → Providers → Email

| 配置项 | 开发环境 | 生产环境 |
|--------|----------|----------|
| Enable Email provider | ON | ON |
| Confirm email | **OFF** | ON |
| Allow new users to sign up | ON | ON |
| 自定义 SMTP | 不需要 | **必须配置** |

---

## 环境变量配置

复制 `.env.example` 为 `.env`，填写以下必填项：

| 变量 | 说明 | 示例 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJ...` |
| `SEED_INVITE_CODE` | 种子邀请码（冷启动用） | `7A3B9F2C` |
| `NEXT_PUBLIC_SEED_INVITE_CODE` | 前端种子码（注册用） | `7A3B9F2C` |
| `NEXT_PUBLIC_TATHA_URL` | Tatha 后端地址（升级引导用） | `http://127.0.0.1:8010` |

---

## 已知账号（测试）

| 邮箱 | 备注 |
|------|------|
| zervi@genz.ltd | 第一个通过邀请码注册的测试账号 |
| test@test.com | 手动插入 auth.users 的测试账号 |
