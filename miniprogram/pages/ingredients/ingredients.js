const { api } = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    ingredients: [],
    categories: ['全部', '蔬菜', '水果', '肉类', '水产', '乳制品', '调料', '主食', '其他'],
    activeCategory: '全部',
    searchText: '',
    loading: true,
    showSearch: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const params = {};
      if (this.data.activeCategory !== '全部') params.category = this.data.activeCategory;
      if (this.data.searchText) params.search = this.data.searchText;
      const ingredients = await api.getIngredients(params);
      this.setData({ ingredients, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      util.showToast(e.message || '加载失败');
    }
  },

  onCategoryTap(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.cat });
    this.loadData();
  },

  toggleSearch() {
    this.setData({ showSearch: !this.data.showSearch, searchText: '' });
    if (this.data.showSearch) return; // just opened
    // just closed — reset
    this.loadData();
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value });
  },

  onSearchConfirm() {
    this.loadData();
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/add/add' });
  },

  async deleteItem(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${name}」吗？会记录为浪费哦`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteIngredient(id, '手动删除');
            util.showToast('已删除', 'success');
            this.loadData();
          } catch (err) {
            util.showToast(err.message || '删除失败');
          }
        }
      }
    });
  },
});
