/**
 * Genzer Terminal — 小程序桥接工具
 *
 * 在 web-view 中运行的 H5 页面，通过 wx.miniProgram API
 * 与小程序原生层通信。
 *
 * 核心能力：
 * 1. 环境检测（是否在小程序 web-view 中）
 * 2. postMessage 通信（H5 → 小程序）
 * 3. 分享桥接（H5 设置分享数据 → 小程序 onShareAppMessage 读取）
 * 4. 页面跳转（H5 请求小程序原生页面跳转）
 * 5. 登录桥接（H5 请求小程序原生登录）
 * 6. URL 参数读取（小程序传来的 exchange_code、tier 等）
 */

/**
 * 检测当前是否在微信小程序 web-view 中运行
 */
export function isMiniProgram(): boolean {
  if (typeof window === 'undefined') return false;
  return /miniProgram/i.test(navigator.userAgent) || window.__wxjs_environment === 'miniprogram';
}

/**
 * 检测当前是否在微信环境（小程序 或 微信浏览器）
 */
export function isWechat(): boolean {
  if (typeof window === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

/**
 * 获取 wx.miniProgram 对象（仅在小程序 web-view 中可用）
 */
function getWxMiniProgram(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).wx?.miniProgram;
}

/**
 * 向小程序发送消息
 * 注意：postMessage 的消息只有在小程序后退、组件销毁、分享时才会触发 onMessage
 * 所以分享数据需要在合适的时机提前发送
 */
export function postMessage(data: Record<string, any>): void {
  const wx = getWxMiniProgram();
  if (!wx) {
    console.warn('[MPBridge] 不在小程序环境，无法发送消息');
    return;
  }
  wx.postMessage({ data });
}

/**
 * 设置分享数据
 * H5 调用此方法设置分享卡片的内容，
 * 小程序 onShareAppMessage 会读取这些数据
 *
 * @param options - 分享选项
 * @param options.title - 分享标题
 * @param options.path - 分享路径（小程序路径，不是 H5 路径）
 * @param options.imageUrl - 分享卡片图片（OG Image URL）
 * @param options.mbti - MBTI 类型（用于分享路径参数）
 */
export function setShareData(options: {
  title?: string;
  path?: string;
  imageUrl?: string;
  mbti?: string;
}): void {
  const shareData = {
    title: options.title || 'Genzer Terminal — 共识网络自治节点',
    imageUrl: options.imageUrl || '',
    path: options.path || `/pages/webview/index?entry=share&mbti=${options.mbti || ''}`,
    mbti: options.mbti || '',
  };

  postMessage({ shareData });
}

/**
 * 请求小程序跳转到原生页面
 * @param url - 小程序页面路径，如 '/pages/auth/login'
 */
export function navigateTo(url: string): void {
  const wx = getWxMiniProgram();
  if (!wx) return;
  wx.navigateTo({ url });
}

/**
 * 请求小程序返回上一页
 */
export function navigateBack(): void {
  const wx = getWxMiniProgram();
  if (!wx) return;
  wx.navigateBack();
}

/**
 * 请求小程序切换到 Tab 页
 * @param url - 小程序 tab 页路径
 */
export function switchTab(url: string): void {
  const wx = getWxMiniProgram();
  if (!wx) return;
  wx.switchTab({ url });
}

/**
 * 请求小程序重定向到某页面
 * @param url - 小程序页面路径
 */
export function redirectTo(url: string): void {
  const wx = getWxMiniProgram();
  if (!wx) return;
  wx.redirectTo({ url });
}

/**
 * 请求小程序原生登录
 * H5 中发现用户未登录时，调用此方法跳转到小程序原生登录页
 */
export function requestLogin(): void {
  postMessage({ action: 'login' });
}

/**
 * 请求小程序原生分享
 * 注意：小程序无法主动调起分享菜单，这里只是提示用户点右上角
 */
export function requestShare(): void {
  postMessage({ action: 'share' });
}

/**
 * 请求小程序原生退出登录
 */
export function requestLogout(): void {
  postMessage({ action: 'logout' });
}

/**
 * 读取小程序通过 URL 传递的参数
 * 包括：exchange_code、tier、source、entry、invite_code、mbti
 *
 * SSO P0（v1.1）：miniprogram_token 已废弃（D3 假 token 链路移除），
 * 新链路为小程序传 exchange_code → H5 跳 /auth/exchange 建会话。
 */
export function getMiniProgramParams(): {
  exchangeCode?: string;
  tier?: string;
  source?: string;
  entry?: string;
  inviteCode?: string;
  mbti?: string;
  isMiniProgram: boolean;
} {
  if (typeof window === 'undefined') {
    return { isMiniProgram: false };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    exchangeCode: params.get('exchange_code') || undefined,
    tier: params.get('tier') || undefined,
    source: params.get('source') || undefined,
    entry: params.get('entry') || undefined,
    inviteCode: params.get('invite_code') || undefined,
    mbti: params.get('mbti') || undefined,
    isMiniProgram: params.get('source') === 'miniprogram',
  };
}

/**
 * 初始化小程序桥接
 * 在 H5 页面加载时调用：
 * 1. 检测是否在小程序环境
 * 2. 如果有 exchange_code，跳转 /auth/exchange 换取真实 cookie session（D4 修复）
 * 3. 设置默认分享数据
 */
export function initMiniProgramBridge(): void {
  if (!isMiniProgram()) return;

  const mpParams = getMiniProgramParams();

  // SSO P0：一次性交换码 → 后端建会话（60s 过期，失败落 /auth/error）
  if (mpParams.exchangeCode) {
    window.location.replace(
      `/auth/exchange?code=${encodeURIComponent(mpParams.exchangeCode)}`
    );
    return; // 页面即将跳转，无需继续初始化
  }

  // 设置默认分享数据
  setShareData({
    title: 'Genzer Terminal — 共识网络自治节点',
  });

  console.log('[MPBridge] 初始化完成，参数:', mpParams);
}
