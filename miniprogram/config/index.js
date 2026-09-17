/**
 * Genzer Terminal 小程序 — 环境配置
 * 借鉴 zervi-test 的 config/index.js
 */

const isDev = __wxConfig ? (__wxConfig.envVersion !== 'release') : true;

const config = {
  // 是否开发环境
  isDev,

  // API 基础地址（后端地址，用于 wx.login 换 token 等）
  apiBaseUrl: isDev
    ? 'http://localhost:3000'
    : 'https://genzer.app',

  // H5 页面地址（web-view 加载地址）
  h5BaseUrl: isDev
    ? 'http://localhost:3000'
    : 'https://genzer.app',

  // OG 卡片生成地址
  ogCardUrl: isDev
    ? 'http://localhost:3000/api/og/card'
    : 'https://genzer.app/api/og/card',

  // 种子邀请码（开发环境直接使用，生产环境从后端获取）
  seedInviteCode: isDev ? 'GENZER2026' : '',

  // 分享默认配置
  shareDefault: {
    title: 'Genzer Terminal — 共识网络自治节点',
    path: '/pages/webview/index',
    imageUrl: '', // 默认使用小程序截图
  },

  // 权限等级定义
  tiers: {
    visitor: 0,   // 未登录
    free: 1,      // 免费用户
    paid: 2,      // 付费用户
    founder: 3,   // 创始人
  },
};

module.exports = config;
