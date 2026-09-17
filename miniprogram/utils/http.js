/**
 * Genzer Terminal 小程序 — HTTP 请求封装
 * 借鉴 zervi-test 的 utils/http.js + iot-smart-control 的 utils/request.js
 *
 * 核心能力：
 * 1. Bearer Token 自动注入
 * 2. 401 自动跳转登录
 * 3. 错误分类（网络/服务器/业务）
 * 4. 请求/响应拦截
 */

const config = require('../config/index');
const { getToken, removeToken } = require('./storage');

/**
 * 基础请求方法
 */
function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    needAuth = true,
    isLoading = false,
    loadingText = '加载中...',
  } = options;

  // Loading
  if (isLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  // 拼接完整 URL
  const fullUrl = url.startsWith('http')
    ? url
    : `${config.apiBaseUrl}${url}`;

  // 构建 header
  const requestHeader = {
    'Content-Type': 'application/json',
    ...header,
  };

  // 注入 Bearer Token
  if (needAuth) {
    const token = getToken();
    if (token) {
      requestHeader['Authorization'] = `Bearer ${token}`;
    }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data,
      header: requestHeader,
      success(res) {
        if (isLoading) wx.hideLoading();

        const { statusCode, data: resData } = res;

        // 2xx 成功
        if (statusCode >= 200 && statusCode < 300) {
          resolve(resData);
          return;
        }

        // 401 未授权 → 清除 token，跳转登录
        if (statusCode === 401) {
          removeToken();
          const app = getApp();
          app.clearAuth();
          wx.redirectTo({ url: '/pages/auth/login' });
          reject({ code: 401, message: '登录已过期，请重新登录' });
          return;
        }

        // 502 后端未启动
        if (statusCode === 502) {
          wx.showToast({ title: '服务暂时不可用', icon: 'none' });
          reject({ code: 502, message: '后端服务未启动' });
          return;
        }

        // 其他错误
        const errMsg = resData?.error || resData?.message || `请求失败(${statusCode})`;
        reject({ code: statusCode, message: errMsg });
      },

      fail(err) {
        if (isLoading) wx.hideLoading();

        // 网络错误
        wx.showToast({ title: '网络连接失败', icon: 'none' });
        reject({ code: -1, message: '网络连接失败', raw: err });
      },
    });
  });
}

/**
 * GET 请求
 */
function get(url, data = {}, options = {}) {
  return request({ url, method: 'GET', data, ...options });
}

/**
 * POST 请求
 */
function post(url, data = {}, options = {}) {
  return request({ url, method: 'POST', data, ...options });
}

/**
 * PUT 请求
 */
function put(url, data = {}, options = {}) {
  return request({ url, method: 'PUT', data, ...options });
}

/**
 * DELETE 请求
 */
function del(url, data = {}, options = {}) {
  return request({ url, method: 'DELETE', data, ...options });
}

/**
 * 上传文件
 */
function upload(url, filePath, name = 'file', formData = {}) {
  const token = getToken();
  const fullUrl = url.startsWith('http') ? url : `${config.apiBaseUrl}${url}`;

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      filePath,
      name,
      url: fullUrl,
      formData,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        try {
          const data = JSON.parse(res.data);
          resolve(data);
        } catch (e) {
          resolve(res.data);
        }
      },
      fail(err) {
        wx.showToast({ title: '上传失败', icon: 'none' });
        reject(err);
      },
    });
  });
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  upload,
};
