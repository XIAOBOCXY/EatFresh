const { api } = require('../../utils/api');
const util = require('../../utils/util');
const app = getApp();

Page({
  data: {
    people: 2,
    dishCount: 3,
    cuisinePref: '家常菜',
    cuisineOptions: ['家常菜', '川菜', '粤菜', '湘菜', '鲁菜', '西餐', '日料', '创意料理'],
    strictMode: false,
    recipes: [],
    loading: false,
    hasToken: false,
    savedRecipes: [],
    showSaved: false,
    allIngredients: [],
    selectedIngredientIds: [],
    showIngredientPicker: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.setData({ hasToken: app.hasToken() });
    this.loadSavedRecipes();
    this.loadIngredients();
  },

  async loadIngredients() {
    try {
      const ingredients = await api.getIngredients();
      this.setData({ allIngredients: ingredients });
    } catch (e) { /* silent */ }
  },

  async loadSavedRecipes() {
    const saved = wx.getStorageSync('saved_recipes') || [];
    this.setData({ savedRecipes: saved });
  },

  // ── Config changes ──
  onPeopleChange(e) {
    const people = parseInt(e.detail.value);
    let dishCount = this.data.dishCount;
    // Smart recommendation
    if (people <= 2 && dishCount > 3) dishCount = 3;
    else if (people <= 4 && dishCount > 5) dishCount = 5;
    this.setData({ people, dishCount });
  },

  onDishCountChange(e) {
    this.setData({ dishCount: parseInt(e.detail.value) });
  },

  getRecommendedDishes() {
    const p = this.data.people;
    if (p === 1) return '推荐 1-2 道';
    if (p === 2) return '推荐 2-3 道';
    if (p === 3) return '推荐 3-4 道';
    if (p <= 5) return '推荐 4-5 道';
    return '推荐 5-7 道';
  },

  onCuisineChange(e) {
    this.setData({ cuisinePref: this.data.cuisineOptions[parseInt(e.detail.value)] });
  },
  toggleMode() {
    this.setData({ strictMode: !this.data.strictMode });
  },

  toggleIngredientPicker() {
    this.setData({ showIngredientPicker: !this.data.showIngredientPicker });
  },

  toggleIngredient(e) {
    const id = e.currentTarget.dataset.id;
    const ids = [...this.data.selectedIngredientIds];
    const idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(id);
    this.setData({ selectedIngredientIds: ids });
  },

  selectAllIngredients() {
    if (this.data.selectedIngredientIds.length === this.data.allIngredients.length) {
      this.setData({ selectedIngredientIds: [] });
    } else {
      this.setData({ selectedIngredientIds: this.data.allIngredients.map(i => i.id) });
    }
  },

  // ── Generate recipes ──
  async generateRecipes() {
    if (!app.hasToken()) {
      wx.showModal({
        title: '需要配置 API Token',
        content: '请先在设置页面配置 DeepSeek API Token',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) wx.switchTab({ url: '/pages/settings/settings' });
        }
      });
      return;
    }

    this.setData({ loading: true, recipes: [], showSaved: false });
    try {
      let ingredients = this.data.selectedIngredientIds.length > 0
        ? this.data.allIngredients.filter(i => this.data.selectedIngredientIds.includes(i.id))
        : this.data.allIngredients;

      if (ingredients.length === 0) {
        util.showToast('冰箱还是空的，请先添加食材');
        this.setData({ loading: false });
        return;
      }

      const recipeData = {
        ingredients: ingredients.map(i => ({
          name: i.name, quantity: i.quantity, unit: i.unit, emoji: i.emoji, id: i.id
        })),
        people: this.data.people,
        dish_count: this.data.dishCount,
        cuisine_pref: this.data.cuisinePref,
        strict_mode: this.data.strictMode,
      };

      const recipes = await api.generateRecipes(recipeData);
      const savedNames = new Set(this.data.savedRecipes.map(r => r.dish_name));
      const marked = recipes.map(r => ({
        ...r,
        isSaved: savedNames.has(r.dish_name),
      }));
      this.setData({ recipes: marked, loading: false, showSaved: false });
    } catch (e) {
      this.setData({ loading: false });
      util.showToast(e.message || '生成失败');
    }
  },

  // ── Save toggle ──
  toggleSave(e) {
    const { index } = e.currentTarget.dataset;
    const recipe = this.data.recipes[index];
    let saved = wx.getStorageSync('saved_recipes') || [];
    const existsIdx = saved.findIndex(r => r.dish_name === recipe.dish_name);
    if (existsIdx >= 0) {
      saved.splice(existsIdx, 1);
      this.setData({ [`recipes[${index}].isSaved`]: false });
    } else {
      saved.push({ ...recipe, savedAt: util.formatDate() });
      this.setData({ [`recipes[${index}].isSaved`]: true });
    }
    wx.setStorageSync('saved_recipes', saved);
    this.setData({ savedRecipes: saved });
  },

  removeSaved(e) {
    const { index } = e.currentTarget.dataset;
    let saved = [...this.data.savedRecipes];
    saved.splice(index, 1);
    wx.setStorageSync('saved_recipes', saved);
    this.setData({ savedRecipes: saved });
  },

  goRecipeDetail(e) {
    const { index } = e.currentTarget.dataset;
    const recipe = this.data.recipes[index];
    wx.navigateTo({
      url: `/pages/recipe-detail/recipe-detail?data=${encodeURIComponent(JSON.stringify(recipe))}`
    });
  },

  goSavedDetail(e) {
    const { index } = e.currentTarget.dataset;
    const recipe = this.data.savedRecipes[index];
    wx.navigateTo({
      url: `/pages/recipe-detail/recipe-detail?data=${encodeURIComponent(JSON.stringify(recipe))}`
    });
  },

  toggleShowSaved() {
    this.setData({ showSaved: !this.data.showSaved });
  },

  goSettings() {
    wx.switchTab({ url: '/pages/settings/settings' });
  },

  preventBubble() {},
});
