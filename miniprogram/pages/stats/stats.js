const { api } = require('../../utils/api');

Page({
  data: {
    stats: null,
    loading: true,
    cookingStats: null,
    showTab: 'waste',
  },

  onLoad() {
    this.loadStats();
    this.loadCookingStats();
  },

  switchTab(e) {
    this.setData({ showTab: e.currentTarget.dataset.tab });
  },

  async loadStats() {
    this.setData({ loading: true });
    try {
      const stats = await api.getWasteStats();
      // Pre-compute percentages for WXML (no .toFixed() in WXML)
      const total = stats.total_quantity || 1;
      stats.by_reason = (stats.by_reason || []).map(r => ({
        ...r,
        pct: Math.round((r.total_qty / total) * 100),
        barWidth: Math.max(2, Math.round((r.total_qty / total) * 100)),
      }));
      stats.recent = (stats.recent || []).slice(0, 10);
      this.setData({ stats, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  loadCookingStats() {
    const raw = wx.getStorageSync('cooking_stats') || {};
    const stats = { total: raw._total || 0, dishes: [], ingredients: [] };
    Object.entries(raw).forEach(([k, v]) => {
      if (k.startsWith('_ing_')) {
        stats.ingredients.push({ name: k.replace('_ing_', ''), count: v });
      } else if (k !== '_total') {
        stats.dishes.push({ name: k, count: v });
      }
    });
    stats.dishes.sort((a, b) => b.count - a.count);
    stats.ingredients.sort((a, b) => b.count - a.count);
    // Pre-compute bar widths
    if (stats.ingredients.length > 0) {
      const max = stats.ingredients[0].count || 1;
      stats.ingredients = stats.ingredients.map(i => ({
        ...i,
        barWidth: Math.max(2, Math.round((i.count / max) * 100)),
      }));
    }
    this.setData({ cookingStats: stats });
  },
});
