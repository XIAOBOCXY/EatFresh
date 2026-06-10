const { api } = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    recipe: null,
  },

  onLoad(options) {
    if (options.data) {
      try {
        const recipe = JSON.parse(decodeURIComponent(options.data));
        const saved = wx.getStorageSync('saved_recipes') || [];
        const exists = saved.findIndex(r => r.dish_name === recipe.dish_name);
        recipe.isSaved = exists >= 0;
        this.setData({ recipe });
      } catch (e) {
        util.showToast('数据解析失败');
      }
    }
  },

  // ── Favorite toggle ──
  toggleSave() {
    const recipe = this.data.recipe;
    let saved = wx.getStorageSync('saved_recipes') || [];
    const idx = saved.findIndex(r => r.dish_name === recipe.dish_name);
    if (idx >= 0) {
      saved.splice(idx, 1);
      this.setData({ 'recipe.isSaved': false });
    } else {
      saved.push({ ...recipe, savedAt: util.formatDate() });
      this.setData({ 'recipe.isSaved': true });
    }
    wx.setStorageSync('saved_recipes', saved);
  },

  // ── Cook this dish ──
  cookDish() {
    const recipe = this.data.recipe;
    if (!recipe) return;

    const usedIngs = recipe.used_ingredients || [];
    if (usedIngs.length === 0) {
      util.showToast('没有可用的食材');
      return;
    }

    // First load all ingredients from DB to match
    wx.showLoading({ title: '检查库存...' });
    api.getIngredients().then(allIngredients => {
      wx.hideLoading();
      const toUpdate = [];
      for (const used of usedIngs) {
        const match = allIngredients.find(i =>
          i.name === used.name || i.name.includes(used.name) || used.name.includes(i.name)
        );
        if (match) {
          toUpdate.push({
            id: match.id, name: match.name, emoji: match.emoji,
            quantity: match.quantity, unit: match.unit,
            newQty: Math.max(0, match.quantity - 1),
          });
        }
      }

      if (toUpdate.length === 0) {
        util.showToast('没有匹配的食材可以扣减');
        return;
      }

      const lines = toUpdate.map(i => {
        if (i.newQty > 0) return `${i.emoji} ${i.name}: ${i.quantity}${i.unit} → ${i.newQty}${i.unit}`;
        return `${i.emoji} ${i.name}: ${i.quantity}${i.unit} → 用完删除`;
      }).join('\n');

      wx.showModal({
        title: `做完「${recipe.dish_name}」`,
        content: `将从库存中扣除:\n${lines}`,
        confirmText: '确认做完',
        cancelText: '取消',
        success: async (res) => {
          if (!res.confirm) return;
          wx.showLoading({ title: '更新库存...' });
          try {
            for (const item of toUpdate) {
              if (item.newQty > 0) {
                await api.updateIngredient(item.id, { quantity: item.newQty });
              } else {
                await api.deleteIngredient(item.id, '已用于烹饪');
              }
            }
            // Record cooking stats
            const stats = wx.getStorageSync('cooking_stats') || {};
            stats[recipe.dish_name] = (stats[recipe.dish_name] || 0) + 1;
            for (const item of toUpdate) {
              stats[`_ing_${item.name}`] = (stats[`_ing_${item.name}`] || 0) + 1;
            }
            stats._total = (stats._total || 0) + 1;
            wx.setStorageSync('cooking_stats', stats);
            wx.hideLoading();
            util.showToast('食材已更新！', 'success');
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (e) {
            wx.hideLoading();
            util.showToast(e.message || '操作失败');
          }
        }
      });
    }).catch(e => {
      wx.hideLoading();
      util.showToast('加载库存失败');
    });
  },

  preventBubble() {},
});
