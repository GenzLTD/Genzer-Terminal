# 战略决策记录（从 PPI 文档摘取）

> 来源：`p4zrht9hpm-sketch/progressive-professional-identity/docs/`
> 摘取日期：2026-05-31
> 原则：只记录决策结论，不重复文档

---

## 1. 产品定位决策

**结论：** PPI 是「共识驱动连接」的 MVP，不是求职工具，不是 DAO 工具。

**来源：** `MVP_DECISION.md §1`

**不做的事：**
- ❌ 不与 JobFirst / PlanetX 打通（MVP 阶段）
- ❌ 不启动 Consensus Claw（Layer 2 功能）
- ❌ 不维护 Iamgeek 与 kung-fu 两套后端

---

## 2. 技术栈决策

**结论：** 选 Next.js + Supabase（单栈），弃 FastAPI 双栈。

**对比：**

| 维度 | Iamgeek（FastAPI） | kung-fu（Supabase） | 决策 |
|------|---------------------|---------------------|------|
| 运维复杂度 | 高（双服务） | 低（Vercel + Supabase） | ✅ Supabase |
| 部署成本 | 需单独部署 API | Vercel 一体化 | ✅ Supabase |
| 实时功能 | WebSocket 自建 | Supabase Realtime | ✅ Supabase |
| 认证 | JWT 自建 | Supabase Auth 内置 | ✅ Supabase |

**来源：** `MVP_DECISION.md §2.2` / `REPO_LANDSCAPE.md §6`

---

## 3. 仓库策略决策

**结论：** `kung-fu` 为唯一主线，其他仓库归档。

**仓库对照：**

| 仓库 | 角色 | 处理方式 |
|------|------|----------|
| `kung-fu` | 唯一代码主线 | ✅ 继续开发 |
| `Iamgeek` | 功能参考书 | 📖 只读参考（邀请制、关注闭环） |
| `kungfu` | 重复仓（同日 init） | 🗄️ 归档，不再改 |
| `kung-fu-2026` | 重复仓（快照） | 🗄️ 归档，不再改 |
| `nextjs-with-supabase` | 官方空模板 | 🗄️ 非产品 |

**为什么三次 init：** 2026-02-21 同日三次 `git init`，无共同祖先，无法 merge。结论是选最完整的 `kung-fu` 继续。

**来源：** `REPO_LANDSCAPE.md §2, §3`

---

## 4. MVP 范围决策

**结论：** 只验证「价值观共识能否驱动真实连接」，ruthlessly 裁剪。

**MVP 必须有（一条用户路径）：**

```
收到邀请 → 注册 → 填 Layer 0 → 发现页看共识度 → 关注一人 → 查看公开主页
```

**明确不做（Phase 2+）：**

| 功能 | 原因 |
|------|------|
| Layer 1/2 完整录入 | MVP 只做 Layer 0 |
| 名片多主题 | 视觉不驱动连接 |
| 复杂搜索/筛选 | 20 人种子用户不需要 |
| Admin 后台 | 先手动运维 |
| Consensus Claw | Layer 2 功能，MVP 后 |
| 三云 / Gitea CI | 运维过度工程 |

**来源：** `MVP_DECISION.md §2.3` / `EXECUTION_PLAN.md`

---

## 5. 成功标准决策

**结论：** 成功 ≠「部署成功」，而是「20 个真人验证假设」。

**30 天指标：**

| 指标 | 目标 | 未达标处理 |
|------|------|----------|
| 种子用户 | 20 人收到邀请并完成注册 | 调整邀请策略 |
| Layer 0 完成率 | ≥ 80% | 优化 onboarding 流程 |
| 人均连接数 | ≥ 1（至少关注 1 人） | 调整发现页算法 |
| 高共识连接占比 | 共识度 ≥ 70% 的连接占 ≥ 50% | 调整共识算法权重 |

**核心原则：** 未达标 → 调整产品假设，而不是换技术栈或开新仓。

**来源：** `MVP_DECISION.md §2.4`

---

## 6. 从 Iamgeek 移植决策

**结论：** 只移植两块（邀请制 + 关注闭环），其他不搬。

| 功能 | Iamgeek 参考 | kung-fu 实现要点 |
|------|-------------|-----------------|
| 邀请码 | `invite_service.py`、注册页实时校验 | Supabase `invites` 表 + RLS；注册前校验；每用户初始额度（如 5） |
| 关注 | `connection_service.py`、发现页按钮 | 已有 `connections` 表；补 POST/DELETE API + 发现页/主页 CTA |

**不移植的部分：**
- ❌ FastAPI 后端（已选 Supabase 单栈）
- ❌ JWT 认证（用 Supabase Auth）
- ❌ E2E 测试全量（只借鉴场景）

**来源：** `MVP_DECISION.md §3` / `EXECUTION_PLAN.md Week 2`

---

## 7. 执行计划（3 周）

**Week 1：** 跑通生产环境（Supabase + Vercel 部署）
**Week 2：** 补 MVP 闭环（邀请制 + 关注）
**Week 3：** 冷启动与度量（20 个种子用户）

**急上线备选（2 周版）：** 若 Week 2 人力不足，直接部署 Iamgeek（FastAPI 版），验证假设后再决定。

**来源：** `EXECUTION_PLAN.md`

---

## 8. 个人原则（避免重蹈覆辙）

1. **停止新建 GitHub 仓库** — 已有仓库够多了
2. **文档减写、代码多加** — MVP 阶段只维护核心文档
3. **与 PlanetX 交付线切割** — PPI 是 content 线，不是 JobFirst SKU
4. **checklist 与代码同步** — 每完成一项打勾

**来源：** `MVP_DECISION.md §5` / `REPO_LANDSCAPE.md §7`

---

---

## 9. 品牌转型决策（2026-07-16）

**结论：** DemoPPI (kungfu) 正式转型为「Genzer Terminal — 共识网络自治节点」。

**背景：** 上游 `szpeter2026/DemoPPI` 自 2026-06-06 起停滞 40 天。团队决定 fork 自主接管。

**变更范围（20 文件）：**

| 维度 | 旧值 | 新值 |
|------|------|------|
| package.json name | `kungfu` | `genzer-terminal` |
| 品牌标题 | "Kungfu \| 共识网络" | "Genzer Terminal \| 共识网络自治节点" |
| 域名 | demoppi.com / demoppi.app | genzer.app |
| 小程序标题 | DemoPPI | Genzer Terminal |
| 种子邀请码 | DEMOPPI2026 | GENZER2026 |
| 对外描述 | "基于价值观匹配的超级个体身份主权社区" | "共识网络自治节点 — 身份 · 信号 · 信任" |
| 导航 Logo 字母 | D | G |

**定位变更：** 从「社区 MVP」升级为「Zervi-Genzer 共识网络的软件终端节点」，为 Phase 3 Ctrl4U 穿戴硬件预备身份与信号基础设施。

**生态对齐链：** `genzer-contracts → Genzer Terminal（本仓库）→ PlanetX → Ctrl4U`

**来源：** `TEAM_DISCUSSION_GENZER_TERMINAL_2026-07-12.md` / Phase 0 实施记录

---

*本文件是「拿来主义」摘取，非完整文档。完整战略见 `p4zrht9hpm-sketch/progressive-professional-identity`。*
