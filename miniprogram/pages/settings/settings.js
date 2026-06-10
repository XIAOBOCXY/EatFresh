const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    token: '',
    hasToken: false,
    tokenMasked: '',
    apiBase: '',
    showToken: false,
    maxDishes: 6,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  onLoad() {
    const token = wx.getStorageSync('deepseek_token') || '';
    const apiBase = wx.getStorageSync('api_base') || app.globalData.apiBase;
    const maxDishes = wx.getStorageSync('max_dishes') || 6;
    const masked = token ? (token.substring(0, 8) + '...' + token.substring(token.length - 4)) : '';
    this.setData({
      token,
      hasToken: !!token,
      tokenMasked: masked,
      apiBase,
      maxDishes,
    });
  },

  onTokenInput(e) {
    this.setData({ token: e.detail.value });
  },

  onApiBaseInput(e) {
    this.setData({ apiBase: e.detail.value });
  },

  toggleShowToken() {
    this.setData({ showToken: !this.data.showToken });
  },

  saveToken() {
    const token = this.data.token.trim();
    if (!token) {
      util.showToast('请输入 API Token');
      return;
    }
    if (!token.startsWith('sk-')) {
      wx.showModal({
        title: 'Token 格式可能不正确',
        content: 'DeepSeek API Token 通常以 sk- 开头，确定保存吗？',
        success: (res) => {
          if (res.confirm) this.doSaveToken(token);
        }
      });
      return;
    }
    this.doSaveToken(token);
  },

  doSaveToken(token) {
    wx.setStorageSync('deepseek_token', token);
    const masked = token.substring(0, 8) + '...' + token.substring(token.length - 4);
    this.setData({
      hasToken: true,
      tokenMasked: masked,
      showToken: false,
    });
    util.showToast('Token 已保存', 'success');
  },

  clearToken() {
    wx.showModal({
      title: '确认清除',
      content: '清除后将无法使用 AI 功能，确定吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('deepseek_token');
          this.setData({
            token: '',
            hasToken: false,
            tokenMasked: '',
            showToken: false,
          });
          util.showToast('Token 已清除');
        }
      }
    });
  },

  saveApiBase() {
    const apiBase = this.data.apiBase.trim();
    if (!apiBase) {
      util.showToast('请输入后端地址');
      return;
    }
    wx.setStorageSync('api_base', apiBase);
    app.globalData.apiBase = apiBase;
    util.showToast('后端地址已保存', 'success');
  },

  onMaxDishesChange(e) {
    const val = parseInt(e.detail.value);
    this.setData({ maxDishes: val });
    wx.setStorageSync('max_dishes', val);
  },

  async testConnection() {
    const { api } = require('../../utils/api');
    try {
      await api.getIngredients();
      util.showToast('后端连接成功', 'success');
    } catch (e) {
      util.showToast('连接失败: ' + (e.message || '未知错误'));
    }
  },

  async testDeepSeek() {
    const token = this.data.token.trim() || wx.getStorageSync('deepseek_token') || '';
    if (!token) {
      util.showToast('请先输入并保存 Token');
      return;
    }
    if (!token.startsWith('sk-')) {
      util.showToast('Token 格式不正确，应以 sk- 开头');
      return;
    }
    wx.showLoading({ title: '测试中...' });
    try {
      // Make a simple API call to DeepSeek
      const resp = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://api.deepseek.com/v1/models',
          method: 'GET',
          timeout: 10000,
          header: { 'Authorization': `Bearer ${token}` },
          success(res) {
            if (res.statusCode === 200) resolve(res.data);
            else reject(new Error(`HTTP ${res.statusCode}`));
          },
          fail(err) {
            reject(new Error(err.errMsg || '请求失败'));
          }
        });
      });
      wx.hideLoading();
      util.showToast('DeepSeek 连接成功', 'success');
    } catch (e) {
      wx.hideLoading();
      util.showToast('Token 无效: ' + (e.message || '未知错误'));
    }
  },
});
