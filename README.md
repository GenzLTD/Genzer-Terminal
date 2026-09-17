# Genzer Terminal — 共识网络自治节点

> Zervi-Genzer 共识网络软件终端 · 为 Ctrl4U 穿戴硬件提供身份与信号基础设施

## 定位

Genzer Terminal 是 Zervi-Genzer 共识网络的**软件终端节点**，前身为 DemoPPI（Progressive Professional Identity MVP）。

作为分布式共识网络中的自治节点，Genzer Terminal 负责：
- **本地用户生命周期** — 邀请 → 注册 → Layer 0 → 发现 → 关注
- **信号处理引擎** — 接收/发送协议层信号，驱动本地行为
- **声誉 + 勋章** — GenzReputation / GenzBadge 链下镜像
- **终端 UI** — Web + 微信小程序

## 与 Zervi 生态的关系

```
Genzer Terminal（本仓库）  = 软件终端节点（链下快路径）
  ↕ 信号协议
genzer-contracts           = 链上信号真源（ActionType + SBT）
  ↕
PlanetX（looma-zervi）     = 游戏化封闭世界（域内匹配闭环）
  ↕
Ctrl4U                     = 穿戴硬件终端（阶段三，规划中）
```

## 技术栈

**Next.js 19 (App Router) + TypeScript + Tailwind CSS + Radix UI + Supabase**

## 当前功能

| 模块 | 功能 | 状态 |
|:--|:--|:--|
| **认证系统** | 邮箱注册/登录、OAuth（Google/GitHub）、微信小程序登录、中间件路由守卫 | ✅ |
| **Layer 0 Onboarding** | 价值观选择（40%）+ 兴趣标签（30%）+ 经验领域（20%）+ 位置（10%） | ✅ |
| **共识算法** | Jaccard 相似度计算，多维度加权评分 | ✅ |
| **发现页** | 共识度排序、标签筛选、分值展示 | ✅ |
| **邀请系统** | 邀请码生成/校验/消耗、额度管理 | ✅ |
| **关注系统** | 关注/取关、发现页+个人主页关注按钮 | ✅ |
| **个人主页** | `/p/[username]` 公开页、共识度详情、OG 分享卡片 | ✅ |
| **声誉系统** | 声誉事件记录、分值查询、防刷保护 | ✅ |
| **SBT 勋章** | 灵魂绑定勋章自动升级 | ✅ |
| **治理提案/投票** | 提案 CRUD、加权投票、Trust FSS | ✅ |
| **MBTI SEO 落地页** | 16 种人格类型详情 + 兼容矩阵 | ✅ |
| **小程序终端** | 微信登录、WebView 桥接、原生分享 | ⚠️ 薄壳（3 页） |

## Genzer 终端改造路线图

| 阶段 | 内容 | 状态 |
|------|------|------|
| **Phase 0** | 仓库重定向：从「Iamgeek MVP」转型为「Genzer Terminal」 | ✅ 完成 |
| **P0** | 信号边界：`app/api/terminal/` (ingress/egress/health) + terminal_signals 审计表 | ⬜ 待开始 |
| **P1** | consensus_match 本地闭环：发现页确认匹配 → reputation event → 信号发送 → 匹配结果页 | ⬜ 待开始 |
| **P2** | 终端 UI 补全：声誉页、勋章墙、匹配星图、小程序完整 TabBar | ⬜ 待开始 |
| **P3** | 对接 genzer-contracts 新 ActionType（MatchIntent、PersonalityBeacon） | ⬜ 待开始 |
| **Phase 3** | Ctrl4U 穿戴硬件集成 | ⬜ 远期规划 |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase URL + Anon Key

# 3. 执行数据库迁移
# 在 Supabase SQL Editor 中依次执行:
#   - supabase/migrations/20260220000000_initial_schema.sql
#   - supabase/migrations/20260220000001_storage_avatars.sql
#   - supabase/migrations/20260530000000_invites.sql
#   - supabase/migrations/20260531000000_fixes_and_seed.sql
#   - supabase/migrations/20260531000001_quota_system.sql
#   - supabase/migrations/20260605000000_trust_fss_records.sql
#   - supabase/migrations/20260605000001_fix_user_tiers_governance_weight.sql

# 4. 启动开发服务器
npm run dev
```

## 项目结构

```
├── app/
│   ├── api/
│   │   ├── auth/miniprogram/   # 微信小程序登录
│   │   ├── reputation/         # 声誉系统（events/score）
│   │   ├── governance/         # 治理提案/投票
│   │   ├── discover/           # 发现页数据
│   │   ├── connections/        # 关注系统
│   │   ├── invites/            # 邀请码管理
│   │   ├── recommendations/    # 推荐算法
│   │   ├── profile/            # Layer 0 / 个人资料
│   │   ├── consensus/          # 共识度查询
│   │   ├── quota/              # 配额管理
│   │   └── tags/               # 标签系统
│   ├── discover/               # 发现页
│   ├── p/[username]/           # 个人公开主页
│   ├── dashboard/invites/      # 邀请码管理
│   ├── onboarding/             # Layer 0 引导
│   ├── mbti/                   # MBTI SEO 落地页
│   └── auth/                   # 认证页面
├── components/
│   ├── share/share-card.tsx    # MBTI 名片分享
│   └── pricing/                # 订阅页面
├── lib/
│   ├── supabase/               # Supabase client（browser + server）
│   ├── consensus/              # 共识算法
│   ├── mbti-data.ts            # MBTI 类型数据
│   └── miniprogram-bridge.ts   # 小程序通信桥接
├── miniprogram/                # 微信小程序终端
│   ├── pages/auth/login        # 邀请码 + 微信登录
│   ├── pages/webview/          # H5 容器页
│   └── utils/                  # 请求/认证/存储工具
├── supabase/migrations/        # 数据库迁移
└── docs/                       # 架构与战略文档
```

## 架构文档

- [`docs/strategy.md`](docs/strategy.md) — 战略决策记录（从 PPI 摘取 8 条决策）
- [`docs/miniprogram-architecture.md`](docs/miniprogram-architecture.md) — 小程序架构设计
- [`TECH_DOC_PLANETX_MATCH_PHASE1_2026-07-12.md`](../zervi-genzer/TECH_DOC_PLANETX_MATCH_PHASE1_2026-07-12.md) — PlanetX 域内匹配闭环技术规格
- [`TEAM_DISCUSSION_GENZER_TERMINAL_2026-07-12.md`](../zervi-genzer/TEAM_DISCUSSION_GENZER_TERMINAL_2026-07-12.md) — Genzer 终端机团队研讨记录

## License

MIT
