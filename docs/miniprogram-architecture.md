# Genzer Terminal 微信小程序架构设计文档

> **⚠️ 品牌变更注记（2026-07-16）：** 本项目已从 DemoPPI 正式更名为 **Genzer Terminal**。
> 本文档为历史架构设计文档，内容保留原貌。文中所有「DemoPPI」的引用在实际代码中已替换为「Genzer Terminal」。
> 详见 `docs/strategy.md §9 — 品牌转型决策`。

> 版本：v1.0（原文日期：2025-06-27）  
> 作者：WeChat Mini Program Developer Agent  
> 原项目路径：`D:/GitHub/szpeter2026/DemoPPI/`  
> 当前路径：`/Users/jason/Projects/DemoPPI/`

---

## 一、项目现状分析

### 1.1 现有 Web 端概况

DemoPPI 是一个基于 **Next.js 14 + Supabase** 的「共识驱动连接」平台，核心价值是让用户通过价值观共识建立真实的职业连接。

| 维度 | 现状 |
|------|------|
| 技术栈 | Next.js 14 (App Router) + Supabase + TailwindCSS + shadcn/ui |
| 数据库 | Supabase PostgreSQL（含 RLS 行级安全） |
| 认证 | Supabase Auth（邮箱 + 邀请码） |
| 部署 | Vercel（前端）+ Supabase Cloud（后端） |
| 核心功能 | 邀请注册 → Layer0 价值观录入 → 发现页浏览 → 关注连接 → 共识度分析 |

### 1.2 已有小程序薄壳代码

`miniprogram/` 目录下已有基础骨架：

| 文件 | 状态 | 说明 |
|------|------|------|
| `app.js` | ✅ 基础 | app 生命周期 + 全局登录检查 |
| `app.json` | ✅ 基础 | 仅注册 3 个页面（login、discover、webview） |
| `config/index.js` | ✅ 可用 | API 基地址配置，含 dev/prod 环境切换 |
| `utils/auth.js` | ⚠️ 需重构 | loginWithCode + token 管理，需对接正式后端 |
| `utils/http.js` | ⚠️ 需重构 | wx.request 封装，需加强拦截器和重试 |
| `utils/storage.js` | ✅ 可用 | Storage Key 常量定义 |
| `pages/auth/login.js` | ⚠️ 需重构 | 获取 code + 传邀请码登录 |
| `pages/webview/index.js` | ✅ 保留 | WebView 容器页（降级方案） |

### 1.3 现有后端 API 清单（可直接复用）

```
/api/auth/miniprogram     — 小程序微信登录（wx.login code + 邀请码）
/api/discover             — 发现页列表（基于共识度推荐）
/api/profile/layer0       — Layer0 价值观 CRUD
/api/profile/by-username  — 按用户名查资料
/api/consensus/[userId]   — 查询两用户共识度
/api/connections/follow   — 关注操作
/api/connections/unfollow — 取消关注
/api/connections/status   — 关注状态查询
/api/recommendations      — 推荐列表
/api/invites/validate     — 邀请码校验
/api/invites/generate     — 生成邀请码
/api/quota/check          — 配额检查
/api/quota/remaining      — 剩余配额
/api/reputation/events    — 声誉事件
/api/reputation/score     — 声誉分值
/api/tags/interests       — 兴趣标签
/api/tags/values          — 价值观标签
/api/governance/proposals — 治理提案
/api/governance/votes     — 投票
```

> **关键优势**：后端 API 已基本齐全，小程序端主要是**前端页面开发 + API 对接**，后端改动极小。

---

## 二、架构设计总览

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                   微信小程序（前端）                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ 主包      │  │ pagesA   │  │ pagesB   │               │
│  │ TabBar×3  │  │ AI 问答  │  │ 通用页面  │               │
│  │ 登录引导  │  │ 对话管理  │  │ WebView  │               │
│  │ 发现/探索  │  │ 分析报告  │  │ 隐私/关于 │               │
│  │ 个人中心  │  │          │  │          │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       └──────────────┼─────────────┘                      │
│                      ▼                                    │
│  ┌───────────────────────────────────────┐               │
│  │          统一请求层 (utils/http.js)    │               │
│  │  认证拦截 · Token 刷新 · 错误处理      │               │
│  └───────────────────┬───────────────────┘               │
└──────────────────────┼──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│              Next.js 后端（Vercel）                       │
│  ┌────────────────┐  ┌─────────────────┐               │
│  │ /api/auth/*    │  │ /api/discover    │               │
│  │ /api/profile/* │  │ /api/connections │               │
│  │ /api/consensus │  │ /api/recommend   │               │
│  │ /api/quota     │  │ /api/reputation  │               │
│  └────────┬───────┘  └────────┬─────────┘               │
│           └─────────┬─────────┘                         │
│                     ▼                                   │
│  ┌──────────────────────────────────┐                   │
│  │         Supabase Cloud             │                   │
│  │  Auth · PostgreSQL · RLS · Realtime│                   │
│  └──────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技术选型决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 开发方式 | **原生开发**（WXML/WXSS/JS） | 项目功能明确、页面数量可控（~22页）；原生性能最优、包体最小；已有薄壳代码可直接扩展 |
| UI 组件库 | **TDesign 微信小程序版** | 腾讯出品，微信生态适配最佳；组件丰富（60+）；主题定制灵活 |
| 状态管理 | **全局数据 + Behavior** | 小程序页面不多，Behavior 复用逻辑足够；避免引入 MobX/MobX-miniprogram 的额外包体 |
| 请求层 | 自封装 `utils/http.js` | 基于现有代码增强，加 Promise 化、拦截器、Token 自动刷新 |
| 后端 | **复用 Next.js API Routes** | 零后端迁移成本；Vercel 已部署 HTTPS 域名；API 已覆盖核心功能 |
| 认证方式 | **wx.login → 后端换 session** | 现有 `/api/auth/miniprogram` 已实现完整流程 |

---

## 三、分包策略与包体控制

### 3.1 分包方案

```
miniprogram/
├── app.js / app.json / app.wxss        ← 主包（≤ 1.5MB）
├── project.config.json
├── config/
│   └── index.js                          ← 环境配置
├── utils/
│   ├── http.js                           ← 统一请求
│   ├── auth.js                           ← 认证管理
│   ├── storage.js                        ← 存储常量
│   └── format.js                         ← 格式化工具
├── behaviors/
│   ├── auth-check.js                     ← 需登录拦截
│   └── share.js                          ← 分享能力
├── components/                            ← 主包组件
│   ├── project-card/                     ← 项目/人物卡片
│   ├── tag-list/                         ← 标签组件
│   ├── search-bar/                       ← 搜索栏
│   ├── empty-state/                      ← 空状态
│   ├── loading-more/                     ← 加载更多
│   └── consensus-badge/                  ← 共识度徽章
│
├── pages/                                 ← 主包页面（TabBar）
│   ├── discover/                          ← 发现 Tab
│   │   ├── index.js / .wxml / .wxss / .json
│   │   ├── detail/                       ← 项目详情
│   │   ├── filter/                       ← 筛选
│   │   ├── search/                       ← 搜索结果
│   │   └── favorites/                    ← 收藏列表
│   ├── explore/                           ← 探索 Tab
│   │   ├── index.js / .wxml / .wxss / .json
│   │   ├── industry/                     ← 行业概览
│   │   ├── company/                      ← 公司详情
│   │   ├── ranking/                      ← 排行榜
│   │   └── trend/                        ← 趋势分析
│   ├── profile/                           ← 我的 Tab
│   │   ├── index.js / .wxml / .wxss / .json
│   │   ├── edit/                         ← 编辑资料
│   │   ├── settings/                     ← 偏好设置
│   │   ├── history/                      ← 浏览记录
│   │   └── feedback/                     ← 反馈建议
│   └── auth/
│       └── login/                         ← 登录页
│
├── pagesA/                                ← 分包 A：AI 智能问答（≤ 800KB）
│   ├── chat/
│   │   ├── list/                         ← 对话列表
│   │   └── detail/                       ← 对话详情（流式对话）
│   └── analysis/
│       └── detail/                       ← 分析报告页
│
└── pagesB/                                ← 分包 B：通用页面（≤ 400KB）
    ├── webview/                           ← WebView 容器
    ├── preview/                           ← 图片预览
    ├── privacy/                           ← 隐私政策
    └── about/                             ← 关于我们
```

### 3.2 app.json 配置

```json
{
  "pages": [
    "pages/discover/index",
    "pages/explore/index",
    "pages/profile/index",
    "pages/auth/login"
  ],
  "subpackages": [
    {
      "root": "pagesA",
      "name": "ai-chat",
      "pages": [
        "chat/list",
        "chat/detail",
        "analysis/detail"
      ]
    },
    {
      "root": "pagesB",
      "name": "common",
      "pages": [
        "webview/index",
        "preview/index",
        "privacy/index",
        "about/index"
      ]
    }
  ],
  "tabBar": {
    "color": "#8c8c8c",
    "selectedColor": "#1a56db",
    "backgroundColor": "#ffffff",
    "borderStyle": "white",
    "list": [
      {
        "pagePath": "pages/discover/index",
        "text": "发现",
        "iconPath": "assets/tab-discover.png",
        "selectedIconPath": "assets/tab-discover-active.png"
      },
      {
        "pagePath": "pages/explore/index",
        "text": "探索",
        "iconPath": "assets/tab-explore.png",
        "selectedIconPath": "assets/tab-explore-active.png"
      },
      {
        "pagePath": "pages/profile/index",
        "text": "我的",
        "iconPath": "assets/tab-profile.png",
        "selectedIconPath": "assets/tab-profile-active.png"
      }
    ]
  },
  "window": {
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTitleText": "DemoPPI",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#f5f5f5",
    "backgroundTextStyle": "dark"
  },
  "preloadRule": {
    "pages/discover/index": {
      "network": "wifi",
      "packages": ["ai-chat"]
    },
    "pages/explore/index": {
      "network": "wifi",
      "packages": ["ai-chat"]
    }
  },
  "requiredPrivateInfos": ["getUserProfile"],
  "permission": {
    "scope.userLocation": {
      "desc": "用于推荐附近行业的项目信息"
    }
  }
}
```

### 3.3 包体预估

| 包 | 内容 | 预估大小 |
|----|------|----------|
| 主包 | TabBar 3页 + 登录 + 12子页 + 6组件 + utils | ~1.2MB |
| pagesA（AI） | 对话列表 + 对话详情 + 分析报告 | ~600KB |
| pagesB（通用） | WebView + 预览 + 隐私 + 关于 | ~300KB |
| **总计** | | **~2.1MB** ✅ |

---

## 四、核心模块设计

### 4.1 认证模块（重构 `utils/auth.js`）

**设计要点：**
- `wx.login()` 获取 code → 调用后端 `/api/auth/miniprogram` → 返回 session token
- Token 存入 `wx.setStorageSync`，请求时自动携带
- Token 过期自动刷新流程
- 邀请码机制：MVP 阶段必须邀请码才能注册

```javascript
// utils/auth.js - 重构后的认证模块
const config = require('../config/index');
const http = require('./http');
const StorageKeys = require('./storage');

const auth = {
  // 检查登录状态
  isLoggedIn() {
    return !!wx.getStorageSync(StorageKeys.ACCESS_TOKEN);
  },

  // 微信登录（给邀请码场景用）
  async loginWithInviteCode(inviteCode) {
    const { code } = await wx.login();
    const res = await http.post('/api/auth/miniprogram', {
      code,
      invite_code: inviteCode.trim().toUpperCase()
    });
    this.saveSession(res);
    return res.user;
  },

  // 静默登录（已有 session 时刷新）
  async silentLogin() {
    try {
      const { code } = await wx.login();
      const res = await http.post('/api/auth/miniprogram/silent', { code });
      this.saveSession(res);
      return res.user;
    } catch (e) {
      this.clearSession();
      throw e;
    }
  },

  saveSession(data) {
    wx.setStorageSync(StorageKeys.ACCESS_TOKEN, data.access_token);
    wx.setStorageSync(StorageKeys.REFRESH_TOKEN, data.refresh_token);
    wx.setStorageSync(StorageKeys.USER_INFO, data.user);
    wx.setStorageSync(StorageKeys.TIER, data.tier);
  },

  clearSession() {
    [StorageKeys.ACCESS_TOKEN, StorageKeys.REFRESH_TOKEN,
     StorageKeys.USER_INFO, StorageKeys.TIER].forEach(k => wx.removeStorageSync(k));
  },

  getUser() {
    return wx.getStorageSync(StorageKeys.USER_INFO) || null;
  },

  getTier() {
    return wx.getStorageSync(StorageKeys.TIER) || 'free';
  }
};

module.exports = auth;
```

### 4.2 网络请求层（重构 `utils/http.js`）

```javascript
// utils/http.js - 增强版请求层
const config = require('../config/index');
const StorageKeys = require('./storage');

const BASE_URL = config.getBaseUrl();

const http = {
  request(options) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync(StorageKeys.ACCESS_TOKEN);
      const url = options.url.startsWith('http')
        ? options.url
        : `${BASE_URL}${options.url}`;

      wx.request({
        url,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          ...options.header
        },
        success(res) {
          if (res.statusCode === 401) {
            // Token 过期 → 触发重新登录
            handleTokenExpired();
            return reject({ code: 401, message: '请重新登录' });
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            const msg = res.data?.error || res.data?.message || '请求失败';
            wx.showToast({ title: msg, icon: 'none' });
            reject({ code: res.statusCode, message: msg });
          }
        },
        fail(err) {
          reject({ code: -1, message: '网络异常，请检查网络' });
        }
      });
    });
  },

  get(url, data) {
    return this.request({ url, method: 'GET', data });
  },

  post(url, data) {
    return this.request({ url, method: 'POST', data });
  },

  put(url, data) {
    return this.request({ url, method: 'PUT', data });
  },

  del(url, data) {
    return this.request({ url, method: 'DELETE', data });
  }
};

function handleTokenExpired() {
  wx.removeStorageSync(StorageKeys.ACCESS_TOKEN);
  wx.removeStorageSync(StorageKeys.REFRESH_TOKEN);
  // 跳转登录页
  wx.reLaunch({ url: '/pages/auth/login' });
}

module.exports = http;
```

### 4.3 发现页（核心页面）

发现页是 MVP 的**核心转化页**，展示基于共识度推荐的项目和人物。

**功能清单：**
- 个性化推荐列表（基于 Layer0 价值观匹配度排序）
- 行业/标签筛选
- 全文搜索
- 项目卡片展示（头像 + 共识度 + 标签）
- 关注/收藏操作
- 下拉刷新 + 上拉加载
- 分享到群聊/好友

**数据流向：**
```
发现页 → GET /api/discover?tags=xxx&sort=consensus
       → GET /api/tags/interests  (筛选条件)
       → POST /api/connections/follow  (关注)
```

### 4.4 AI 问答模块（分包 pagesA）

这是 DemoPPI 的**差异化核心**——让用户通过 AI 对话深入了解项目和人物。

**设计要点：**
- 对话列表：展示历史对话
- 对话详情：流式输出（wx.request + chunk 读取）或轮询
- 上下文管理：携带当前查看的项目/人物信息
- 生成报告：AI 分析结果结构化展示

> **注意**：AI 问答需要后端新增 SSE/流式接口。Web 端可能已有类似能力（需确认），小程序端需要适配。

### 4.5 分享裂变机制

微信生态内裂变是获取用户的核心手段：

```javascript
// 在项目详情页实现
onShareAppMessage() {
  const { project } = this.data;
  return {
    title: `${project.name} - 价值观匹配度 ${project.consensus}%`,
    path: `/pages/discover/detail?id=${project.id}&from=share`,
    imageUrl: project.avatar || '/assets/share-default.png'
  };
},

// 分享到朋友圈
onShareTimeline() {
  const { project } = this.data;
  return {
    title: `来 DemoPPI 发现志同道合的人`,
    query: `id=${project.id}`,
    imageUrl: project.avatar || '/assets/share-default.png'
  };
}
```

**裂变路径：**
1. 用户 A 在发现页看到感兴趣的项目 → 点击「分享给好友」
2. 好友 B 打开分享卡片 → 注册（需邀请码或分享码豁免）→ 进入详情
3. B 关注 A → A 获得声誉加分 → 形成正向激励

---

## 五、API 对接映射表

| 小程序页面 | 后端 API | 方法 | 说明 |
|-----------|----------|------|------|
| 登录页 | `/api/auth/miniprogram` | POST | wx.login code + 邀请码 |
| 邀请码校验 | `/api/invites/validate` | POST | 输入时实时校验 |
| 发现页列表 | `/api/discover` | GET | 推荐列表（含分页） |
| 项目详情 | `/api/profile/by-username/[username]` | GET | 查看用户公开信息 |
| 共识度 | `/api/consensus/[userId]` | GET | 两人共识度分数 |
| 关注 | `/api/connections/follow` | POST | 关注某用户 |
| 取关 | `/api/connections/unfollow` | DELETE | 取消关注 |
| 关注状态 | `/api/connections/status` | GET | 是否已关注 |
| Layer0 编辑 | `/api/profile/layer0` | PUT | 更新价值观 |
| Layer0 查看 | `/api/profile/layer0/[userId]` | GET | 查看他人 Layer0 |
| 标签列表 | `/api/tags/interests` | GET | 兴趣标签选项 |
| 价值观标签 | `/api/tags/values` | GET | 价值观标签选项 |
| 配额检查 | `/api/quota/check` | GET | 当前用户配额 |
| 声誉分 | `/api/reputation/score` | GET | 声誉分数 |
| 邀请码生成 | `/api/invites/generate` | POST | 生成新邀请码 |
| 推荐列表 | `/api/recommendations` | GET | 个性化推荐 |

> **后端零改动**：以上 API 全部已在 Next.js 端实现，小程序端直接调用即可。

---

## 六、性能优化策略

### 6.1 启动优化

| 策略 | 实现方式 |
|------|----------|
| 分包预加载 | `preloadRule` 配置 WiFi 下预下载 pagesA |
| 主包精简 | 图片全部放 CDN，TabBar 图标压缩 ≤ 10KB |
| 首屏直出 | 发现页首次加载只取 10 条，骨架屏占位 |
| 静默登录 | `app.onLaunch` 中静默检查 token，过期再弹登录 |

### 6.2 渲染优化

| 策略 | 实现方式 |
|------|----------|
| setData 批量化 | 合并多次 setData 为一次，路径更新而非全量 |
| 列表虚拟化 | 发现页长列表使用 `recycle-view` 或分页加载 |
| 图片懒加载 | 使用 `lazy-load` 属性 + CDN WebP 格式 |
| 纯数据字段 | Behavior 中标记 `pureDataPattern: /^_is/` |

### 6.3 网络优化

| 策略 | 实现方式 |
|------|----------|
| 请求缓存 | 不变的配置数据（标签列表）缓存到 Storage，设 30 分钟过期 |
| 数据预取 | TabBar 切换时预取下一页数据 |
| 请求去重 | 同一 URL 并发请求只发一次 |
| 离线容错 | 无网络时展示缓存数据 + Toast 提示 |

---

## 七、微信生态集成

### 7.1 社交分享

- **onShareAppMessage**：分享给好友/群聊，携带项目 ID 和分享来源
- **onShareTimeline**：分享到朋友圈
- **分享卡片**：自定义标题、描述、图片，展示共识度吸引用户

### 7.2 订阅消息（替代模板消息）

在以下场景请求订阅消息授权：

| 触发场景 | 模板内容 | 授权时机 |
|----------|----------|----------|
| 有人关注了你 | 「{nickname} 开始关注你，快去看看 TA 的价值观」 | 关注成功后 |
| 共识匹配提醒 | 「你和 {nickname} 的价值观匹配度高达 {score}%」 | 查看详情后 |
| 邀请码被使用 | 「你的邀请码已被使用，声誉 +10」 | 分享后 |

### 7.3 用户隐私合规

- `requiredPrivateInfos` 声明需要用到的隐私接口
- 首次使用敏感功能前弹窗获取用户授权
- 隐私政策页面（`pagesB/privacy`）
- 不主动获取手机号、地理位置等非必要信息

---

## 八、上线计划（4 周快速上线）

### Phase 1：核心闭环（第 1-2 周）

**目标：跑通 MVP 核心路径 — 邀请注册 → 发现 → 关注**

| 任务 | 预估工时 | 优先级 |
|------|----------|--------|
| 重构 `utils/http.js` 请求层 | 0.5d | P0 |
| 重构 `utils/auth.js` 认证模块 | 0.5d | P0 |
| 重构登录页（邀请码 + 微信授权） | 1d | P0 |
| Onboarding 引导页（Layer0 录入） | 1.5d | P0 |
| 发现页主页面（列表 + 筛选 + 搜索） | 2d | P0 |
| 项目/人物详情页 | 1d | P0 |
| 关注/取关功能 | 0.5d | P0 |
| TabBar + 主包框架搭建 | 0.5d | P0 |
| TDesign 组件集成 | 0.5d | P0 |

**Phase 1 产出：** 可提交审核的最小可用版本

### Phase 2：体验增强（第 3 周）

| 任务 | 预估工时 | 优先级 |
|------|----------|--------|
| 探索页（行业概览 + 排行榜） | 1.5d | P1 |
| 个人中心页（资料 + 设置 + 历史） | 1.5d | P1 |
| 收藏功能 | 0.5d | P1 |
| 分享功能（好友 + 朋友圈） | 1d | P1 |
| 订阅消息接入 | 0.5d | P1 |
| 骨架屏 + Loading 优化 | 1d | P1 |
| 隐私政策 + 关于我们 | 0.5d | P2 |

### Phase 3：AI 差异化（第 4 周）

| 任务 | 预估工时 | 优先级 |
|------|----------|--------|
| AI 对话列表页（分包 pagesA） | 1d | P1 |
| AI 对话详情页（流式/轮询） | 2d | P1 |
| 分析报告页 | 1.5d | P1 |
| 后端 AI 接口对接（可能需新增） | 1d | P1 |
| 整体测试 + Bug 修复 | 2d | P0 |

### 审核提交流程

```
1. 代码自审 → 检查隐私合规、API 域名白名单
2. 真机测试 → iOS + Android 各测一遍核心路径
3. 性能检测 → 微信开发者工具「体验评分」≥ 85
4. 提交审核 → 准备测试账号（含邀请码）、隐私链接
5. 审核通过 → 分阶段发布（先 10% 灰度）
```

---

## 九、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 微信审核不通过 | 延迟上线 | 提前确认类目（社交/工具）；隐私政策必须完整；不获取非必要权限 |
| AI 流式输出在小程序端兼容性 | 体验降级 | 备选方案：短轮询（每 500ms 拉一次），而非 SSE；微信小程序不支持 ReadableStream |
| 邀请码制限制增长速度 | 用户获取慢 | 分享裂变可生成一次性分享码（无需输入邀请码）；考虑后期开放体验版 |
| 包体超限 | 无法提交 | 严格执行分包策略；图片走 CDN；组件库按需引入 |
| Token 管理复杂（Supabase） | 登录态丢失 | 现有后端 mock 模式可以快速降级；生产环境需加固 token 刷新逻辑 |

---

## 十、与 Web 端的关系

### 10.1 共享部分

- **后端 API**：100% 共享（Next.js API Routes）
- **数据库**：100% 共享（Supabase）
- **认证体系**：共享 Supabase Auth（小程序用 wx_openid，Web 用邮箱）
- **业务逻辑**：共识度算法、声誉系统等

### 10.2 差异化部分

| 维度 | Web 端 | 小程序端 |
|------|--------|----------|
| 入口 | SEO 搜索 + 直接访问 | 微信扫码 + 分享 + 搜索 |
| 认证 | 邮箱 + 密码 | 微信一键授权 + 邀请码 |
| 分享 | 链接分享 | 微信好友/群聊/朋友圈原生卡片 |
| 推送 | 无 | 订阅消息 |
| UI | shadcn/ui (React) | TDesign (WXML) |
| 性能 | PC/移动浏览器 | 微信内嵌渲染引擎 |

### 10.3 WebView 降级方案

保留 `pagesB/webview` 作为降级方案：
- 不需要原生交互的复杂页面（如治理投票详情）可先走 WebView
- 部分新功能可以 Web 端先行，小程序用 WebView 嵌入

---

## 十一、关键成功指标

| 指标 | MVP 目标 | 数据来源 |
|------|----------|----------|
| 邀请注册转化率 | > 70%（收到邀请 → 完成注册） | 后端埋点 |
| Onboarding 完成率 | > 80%（注册 → 完成 Layer0） | Layer0 完成事件 |
| 日活用户关注数 | ≥ 1（至少关注 1 人） | connections 表统计 |
| AI 问答使用率 | > 40%（DAU 中使用 AI 功能的比例） | 对话表统计 |
| 分享打开率 | > 15%（分享卡片 → 好友打开） | 分享埋点 |
| 7 日留存 | > 25% | 自定义分析 |
| 微信审核通过率 | 首次提交即通过 | — |

---

## 十二、后续演进方向

1. **Skyline 渲染引擎迁移**：使用 Skyline 获得更流畅的动画体验（特别适合 AI 对话页的打字机效果）
2. **微信云开发集成**：将部分高频 API（如关注状态查询）迁移到微信云函数，降低 Vercel 服务器压力
3. **视频号 + 小程序直播**：通过视频号内容吸引流量 → 小程序承接转化
4. **企业微信打通**：B 端场景（企业组织使用 PPI 做内部价值观共识）
5. **公众号联动**：公众号文章内嵌小程序卡片，实现内容-社交闭环

---

> 本文档基于原 DemoPPI（现 Genzer Terminal）项目代码分析生成，所有 API 路径和功能设计均基于已实现的后端接口。架构方案优先考虑「快速上线」和「微信生态原生体验」。
> **品牌变更注记**：2026-07-16 起项目已更名为 Genzer Terminal，实际代码中所有品牌引用已同步更新。
