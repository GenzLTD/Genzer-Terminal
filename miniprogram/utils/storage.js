/**
 * Genzer Terminal 小程序 — 本地存储管理
 * 借鉴 iot-smart-control 的 utils/storage.js
 *
 * 核心能力：
 * 1. 带过期时间的 Storage
 * 2. Token 管理（access + refresh）
 * 3. 安全的 get/set/remove
 */

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const USER_INFO_KEY = 'user_info';
const USER_TIER_KEY = 'user_tier';

/**
 * 设置带过期时间的 Storage
 */
function setWithExpiry(key, value, expiryMs) {
  const item = {
    value,
    expiry: expiryMs ? Date.now() + expiryMs : null,
  };
  try {
    wx.setStorageSync(key, JSON.stringify(item));
  } catch (e) {
    console.warn('[Storage] setWithExpiry failed:', key, e);
  }
}

/**
 * 获取带过期时间的 Storage（过期自动删除）
 */
function getWithExpiry(key) {
  try {
    const raw = wx.getStorageSync(key);
    if (!raw) return null;

    const item = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // 没有过期时间，直接返回
    if (!item.expiry) return item.value;

    // 已过期，删除并返回 null
    if (Date.now() > item.expiry) {
      wx.removeStorageSync(key);
      return null;
    }

    return item.value;
  } catch (e) {
    console.warn('[Storage] getWithExpiry failed:', key, e);
    return null;
  }
}

/**
 * ====== Token 管理 ======
 */

/**
 * 保存 Token（access + refresh）
 * accessToken 默认 7 天过期，refreshToken 默认 30 天过期
 */
function setToken(accessToken, refreshToken) {
  wx.setStorageSync(TOKEN_KEY, accessToken);
  if (refreshToken) {
    wx.setStorageSync(REFRESH_TOKEN_KEY, refreshToken);
  }
  // access token 7 天过期
  setWithExpiry(TOKEN_EXPIRY_KEY, true, 7 * 24 * 60 * 60 * 1000);
}

/**
 * 获取 Token（如果过期返回 null）
 */
function getToken() {
  const expired = getWithExpiry(TOKEN_EXPIRY_KEY);
  if (!expired) return null;
  return wx.getStorageSync(TOKEN_KEY) || null;
}

/**
 * 获取 Refresh Token
 */
function getRefreshToken() {
  return wx.getStorageSync(REFRESH_TOKEN_KEY) || null;
}

/**
 * 移除所有 Token
 */
function removeToken() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(REFRESH_TOKEN_KEY);
  wx.removeStorageSync(TOKEN_EXPIRY_KEY);
}

/**
 * 检查 Token 是否即将过期（1 天内）
 */
function isTokenExpiringSoon() {
  try {
    const raw = wx.getStorageSync(TOKEN_EXPIRY_KEY);
    if (!raw) return true;

    const item = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!item.expiry) return false;

    const remaining = item.expiry - Date.now();
    return remaining < 24 * 60 * 60 * 1000; // 1 天内
  } catch (e) {
    return true;
  }
}

/**
 * ====== 用户信息管理 ======
 */

function setUserInfo(userInfo) {
  wx.setStorageSync(USER_INFO_KEY, userInfo);
}

function getUserInfo() {
  return wx.getStorageSync(USER_INFO_KEY) || null;
}

function setUserTier(tier) {
  wx.setStorageSync(USER_TIER_KEY, tier);
}

function getUserTier() {
  return wx.getStorageSync(USER_TIER_KEY) || 'visitor';
}

/**
 * 清除所有认证数据
 */
function clearAuth() {
  removeToken();
  wx.removeStorageSync(USER_INFO_KEY);
  wx.removeStorageSync(USER_TIER_KEY);
}

module.exports = {
  setWithExpiry,
  getWithExpiry,
  setToken,
  getToken,
  getRefreshToken,
  removeToken,
  isTokenExpiringSoon,
  setUserInfo,
  getUserInfo,
  setUserTier,
  getUserTier,
  clearAuth,
};
