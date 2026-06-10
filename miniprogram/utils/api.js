/**
 * HTTP request wrapper for mini-program.
 * Injects API token from local storage for AI endpoints.
 */
const app = getApp();

const request = (options) => {
  return new Promise((resolve, reject) => {
    const { url, method = 'GET', data, header = {}, isAI = false } = options;
    const baseUrl = app.globalData.apiBase;

    // Inject token for AI endpoints
    if (isAI) {
      const token = wx.getStorageSync('deepseek_token');
      if (!token) {
        reject(new Error('请先在设置中配置 DeepSeek API Token'));
        return;
      }
      header['Authorization'] = `Bearer ${token}`;
    }

    wx.request({
      url: `${baseUrl}${url}`,
      method,
      data,
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        ...header,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = (res.data && res.data.error) || `请求失败 (${res.statusCode})`;
          reject(new Error(msg));
        }
      },
      fail(err) {
        console.error('Request failed:', err);
        if (err.errMsg && err.errMsg.includes('timeout')) {
          reject(new Error('请求超时，请检查网络'));
        } else {
          reject(new Error('网络连接失败，请检查后端服务是否启动'));
        }
      },
    });
  });
};

const api = {
  // ── Ingredients ──
  getIngredients(params = {}) {
    const query = Object.entries(params)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return request({ url: `/api/ingredients${query ? '?' + query : ''}` });
  },

  getIngredient(id) {
    return request({ url: `/api/ingredients/${id}` });
  },

  addIngredient(data) {
    return request({ url: '/api/ingredients', method: 'POST', data });
  },

  batchAddIngredients(items) {
    return request({ url: '/api/ingredients/batch', method: 'POST', data: { items } });
  },

  updateIngredient(id, data) {
    return request({ url: `/api/ingredients/${id}`, method: 'PUT', data });
  },

  deleteIngredient(id, reason) {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return request({ url: `/api/ingredients/${id}${query}`, method: 'DELETE' });
  },

  markWaste(id, data) {
    return request({ url: `/api/ingredients/${id}/waste`, method: 'POST', data });
  },

  getPresets() {
    return request({ url: '/api/ingredients/presets' });
  },

  // ── AI ──
  parseText(text) {
    return request({ url: '/api/ai/parse-text', method: 'POST', data: { text }, isAI: true });
  },

  generateRecipes(data) {
    return request({ url: '/api/ai/recipes', method: 'POST', data, isAI: true });
  },

  getTips(ingredients) {
    return request({ url: '/api/ai/tips', method: 'POST', data: { ingredients }, isAI: true });
  },

  // ── Stats ──
  getWasteStats() {
    return request({ url: '/api/stats/waste' });
  },
};

module.exports = { api, request };
