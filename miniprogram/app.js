/**
 * AI Fridge Manager — App Entry
 */
App({
  globalData: {
    // Backend API base URL — change to your server address
    apiBase: 'http://127.0.0.1:5000',
    // DeepSeek token stored locally, not in globalData
  },

  onLaunch() {
    // Check if token is configured
    const token = wx.getStorageSync('deepseek_token');
    if (!token) {
      console.log('DeepSeek token not configured yet');
    }
  },

  /** Get stored API token */
  getToken() {
    return wx.getStorageSync('deepseek_token') || '';
  },

  /** Check if token is configured */
  hasToken() {
    return !!wx.getStorageSync('deepseek_token');
  }
});
