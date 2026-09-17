/**
 * Genzer Terminal 小程序 — web-view 主页
 *
 * 核心功能：
 * 1. 加载 Genzer Terminal H5 页面
 * 2. postMessage 通信桥接（H5 ↔ 小程序）
 * 3. onShareAppMessage 分享钩子（动态卡片图）
 * 4. URL 参数透传（邀请码、entry 等）
 * 5. Token 同步（小程序 → H5 via URL params）
 */

const config = require('../../config/index');
const { getToken } = require('../../utils/storage');
const { isGovernor } = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    // web-view 加载的 URL
    webviewUrl: '',
    // 是否已加载
    loaded: false,
    // 分享数据（由 H5 postMessage 传来）
    shareData: null,
  },

  onLoad(options) {
    const url = this._buildWebviewUrl(options);
    this.setData({ webviewUrl: url });
  },

  onShow() {
    // 每次 show 时检查 token 是否变化（比如从登录页回来）
    const currentUrl = this.data.webviewUrl;
    if (currentUrl && this._tokenChanged()) {
      this.setData({
        webviewUrl: this._buildWebviewUrl({}),
      });
    }
  },

  /**
   * 构建 web-view URL
   * 透传参数：entry（入口标识）、invite_code（邀请码）、token（认证）
   */
  _buildWebviewUrl(options) {
    const { h5BaseUrl } = config;
    let url = h5BaseUrl;

    // 解析参数
    const params = [];

    // 入口参数
    if (options.entry) {
      params.push(`entry=${options.entry}`);
    }

    // 邀请码参数
    if (options.invite_code) {
      params.push(`invite_code=${options.invite_code}`);
    }

    // MBTI 参数（从分享卡片点进来）
    if (options.mbti) {
      params.push(`mbti=${options.mbti}`);
    }

    // Token 同步：小程序已登录 → 传给 H5
    const token = getToken();
    if (token) {
      params.push(`miniprogram_token=${encodeURIComponent(token)}`);
    }

    // 用户等级
    if (app.globalData.tier) {
      params.push(`tier=${app.globalData.tier}`);
    }

    // 来源标识
    params.push('source=miniprogram');

    if (params.length > 0) {
      url += (url.includes('?') ? '&' : '?') + params.join('&');
    }

    return url;
  },

  /**
   * 检查 token 是否发生了变化
   */
  _tokenChanged() {
    const currentToken = getToken();
    const urlToken = this.data.webviewUrl.match(/miniprogram_token=([^&]*)/);
    const urlHasToken = urlToken ? decodeURIComponent(urlToken[1]) : null;
    return currentToken !== urlHasToken;
  },

  /**
   * web-view 加载完成
   */
  onWebViewLoad() {
    this.setData({ loaded: true });
  },

  /**
   * web-view 消息回调
   * H5 通过 wx.miniProgram.postMessage 发送消息
   *
   * 支持的消息类型：
   * - shareData: 分享数据（title, path, imageUrl）
   * - navigateTo: 页面跳转
   * - login: 请求登录
   * - shareCard: 触发分享
   */
  onMessage(e) {
    const data = e.detail.data;
    if (!data || !Array.isArray(data) || data.length === 0) return;

    // 取最后一条消息（微信会累积消息）
    const msg = data[data.length - 1];
    console.log('[Webview] 收到消息:', msg);

    // 分享数据
    if (msg.shareData) {
      this.setData({ shareData: msg.shareData });
      app.setShareData(msg.shareData);
    }

    // 页面跳转
    if (msg.navigateTo) {
      wx.navigateTo({ url: msg.navigateTo });
    }

    // 请求登录
    if (msg.action === 'login') {
      wx.redirectTo({ url: '/pages/auth/login' });
    }

    // 触发分享
    if (msg.action === 'share') {
      // 小程序无法主动调起分享，只能引导用户点右上角
      wx.showToast({ title: '请点击右上角分享', icon: 'none' });
    }

    // 退出登录
    if (msg.action === 'logout') {
      app.clearAuth();
      this.setData({
        webviewUrl: this._buildWebviewUrl({}),
      });
    }
  },

  /**
   * web-view 加载失败
   */
  onWebViewError() {
    wx.showToast({ title: '页面加载失败，请检查网络', icon: 'none' });
  },

  /**
   * 分享给朋友
   * 支持 H5 动态传入分享数据，否则使用默认值
   */
  onShareAppMessage() {
    const shareData = this.data.shareData || app.globalData.shareData;

    if (shareData) {
      return {
        title: shareData.title || config.shareDefault.title,
        path: shareData.path || `/pages/webview/index?entry=share&mbti=${shareData.mbti || ''}`,
        imageUrl: shareData.imageUrl || '',
      };
    }

    // 默认分享
    return {
      title: config.shareDefault.title,
      path: '/pages/webview/index?entry=share',
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const shareData = this.data.shareData || app.globalData.shareData;

    if (shareData) {
      return {
        title: shareData.title || config.shareDefault.title,
        query: `entry=timeline&mbti=${shareData.mbti || ''}`,
        imageUrl: shareData.imageUrl || '',
      };
    }

    return {
      title: config.shareDefault.title,
      query: 'entry=timeline',
    };
  },
});
