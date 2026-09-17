/**
 * Genzer Terminal 小程序 — 登录页
 *
 * 登录方式：
 * 1. 微信一键登录（wx.login → 后端换 token）
 * 2. 邀请码输入（必须，用于控制社区准入）
 *
 * 流程：
 *   输入邀请码 → 验证 → 微信授权 → wx.login 拿 code
 *   → 后端 /api/auth/miniprogram 换 token → 跳转 web-view
 */

const config = require('../../config/index');
const http = require('../../utils/http');
const storage = require('../../utils/storage');
const app = getApp();

Page({
  data: {
    // 邀请码
    inviteCode: '',
    // 是否正在请求
    loading: false,
    // 错误信息
    errorMsg: '',
    // 步骤：1=输入邀请码 2=微信登录
    step: 1,
    // 邀请码验证状态
    inviteCodeValid: false,
  },

  onLoad(options) {
    // 如果 URL 带了邀请码，自动填入
    if (options.invite_code) {
      this.setData({ inviteCode: options.invite_code.toUpperCase() });
    }
  },

  /**
   * 输入邀请码
   */
  onInviteCodeInput(e) {
    const code = e.detail.value.toUpperCase();
    this.setData({
      inviteCode: code,
      errorMsg: '',
      inviteCodeValid: false,
    });
  },

  /**
   * 验证邀请码
   */
  async onValidateInviteCode() {
    const { inviteCode } = this.data;

    if (!inviteCode || inviteCode.trim().length === 0) {
      this.setData({ errorMsg: '请输入邀请码' });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });

    try {
      const res = await http.post('/api/invites/validate', {
        code: inviteCode.trim(),
      }, { needAuth: false });

      if (res.valid) {
        this.setData({
          inviteCodeValid: true,
          step: 2,
          loading: false,
        });
      } else {
        this.setData({
          errorMsg: res.error || '邀请码无效',
          loading: false,
        });
      }
    } catch (err) {
      this.setData({
        errorMsg: err.message || '验证失败，请重试',
        loading: false,
      });
    }
  },

  /**
   * 微信一键登录
   */
  async onWechatLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true, errorMsg: '' });

    try {
      // Step 1: wx.login 拿 code
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject,
        });
      });

      if (!loginRes.code) {
        throw new Error('微信登录失败，请重试');
      }

      // Step 2: 发送 code + invite_code 到后端换 token
      const authRes = await http.post('/api/auth/miniprogram', {
        code: loginRes.code,
        invite_code: this.data.inviteCode.trim(),
      }, { needAuth: false });

      if (authRes.access_token) {
        // Step 3: 保存认证信息
        storage.setToken(authRes.access_token, authRes.refresh_token);
        storage.setUserInfo(authRes.user);
        storage.setUserTier(authRes.tier || 'free');

        app.setAuth({
          token: authRes.access_token,
          userInfo: authRes.user,
          tier: authRes.tier || 'free',
        });

        // Step 4: 跳转到 web-view 主页
        wx.reLaunch({
          url: '/pages/webview/index?entry=login',
        });
      } else {
        throw new Error(authRes.error || '登录失败');
      }
    } catch (err) {
      console.error('[Login] 登录失败:', err);
      this.setData({
        errorMsg: err.message || '登录失败，请重试',
        loading: false,
      });
    }
  },

  /**
   * 返回上一步
   */
  onGoBack() {
    this.setData({ step: 1, inviteCodeValid: false });
  },

  /**
   * 分享（登录页也可以分享，用于拉新）
   */
  onShareAppMessage() {
    return {
      title: 'Genzer Terminal — 共识网络自治节点',
      path: '/pages/auth/login',
    };
  },
});
