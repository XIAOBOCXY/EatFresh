Component({
  data: {
    selected: 1,
    list: [
      { pagePath: '/pages/ingredients/ingredients', text: '食材清单', icon: '📋' },
      { pagePath: '/pages/index/index', text: '我的冰箱', icon: '🏠' },
      { pagePath: '/pages/recipes/recipes', text: '智能菜谱', icon: '🍳' },
      { pagePath: '/pages/settings/settings', text: '设置', icon: '⚙️' }
    ]
  },

  methods: {
    switchTab(e) {
      const { path } = e.currentTarget.dataset;
      wx.switchTab({ url: path });
    }
  }
});
