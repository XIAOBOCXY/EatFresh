const { api } = require('../../utils/api');
const util = require('../../utils/util');
const app = getApp();

Page({
  data: {
    ingredients: [],
    tipList: [],
    tipIndex: 0,
    selectedIngredient: null,
    showDetail: false,
    loading: true,
    loadError: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadData();
    this.loadTips();
    this.startTipScroll();
  },

  onHide() {
    this.stopTipScroll();
  },

  onUnload() {
    this.stopTipScroll();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  // ── Tips scroll (4s, lightweight) ──
  _tipTimer: null,
  startTipScroll() {
    this.stopTipScroll();
    if (this.data.tipList.length <= 1) return;
    this._tipTimer = setInterval(() => {
      const next = (this.data.tipIndex + 1) % this.data.tipList.length;
      this.setData({ tipIndex: next });
    }, 4000);
  },
  stopTipScroll() {
    if (this._tipTimer) { clearInterval(this._tipTimer); this._tipTimer = null; }
  },

  // ── Load data ──
  async loadData() {
    try {
      const ingredients = await api.getIngredients();
      const positioned = ingredients.map((item, index) => {
        const seed = (index * 137 + item.id * 53) % 100;
        const px = 15 + (seed * 7) % 65;
        const py = 8 + (seed * 11) % 72;
        return {
          ...item, posX: px, posY: py,
          rotate: ((seed * 13) % 20) - 10,
          scale: 0.9 + ((seed * 3) % 20) / 100,
          _x: px, _y: py,
        };
      });
      this.setData({ ingredients: positioned, loading: false, loadError: false });
      this.tryGyro();
    } catch (e) {
      this.setData({ loading: false, loadError: true });
    }
  },

  async loadTips() {
    if (!app.hasToken()) return;
    try {
      const result = await api.getTips();
      const tips = result.tips || [];
      this.setData({ tipList: tips, tipIndex: 0 });
      this.startTipScroll();
    } catch (e) {}
  },

  // ── Gyroscope (real device only) ──
  tryGyro() {
    try {
      wx.startGyroscope({
        interval: 'game',
        success: () => {
          wx.onGyroscopeChange((res) => {
            this._gyroX = res.x * 15;
            this._gyroY = res.y * 15;
          });
        },
        fail: () => {}
      });
    } catch (e) {}
  },

  // ── Touch drag ──
  _touchX: 0, _touchY: 0, _moved: false, _dragId: null,

  onTouchStart(e) {
    this._touchX = e.touches[0].clientX;
    this._touchY = e.touches[0].clientY;
    this._moved = false;
    this._dragId = e.currentTarget.dataset.id;
  },

  onTouchMove(e) {
    const dx = e.touches[0].clientX - this._touchX;
    const dy = e.touches[0].clientY - this._touchY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this._moved = true;
    if (!this._moved || this._dragId == null) return;

    const idx = this.data.ingredients.findIndex(i => i.id === this._dragId);
    if (idx < 0) return;
    const sys = wx.getWindowInfo();
    const fw = sys.windowWidth - 48;
    const fh = 620 * (sys.windowWidth / 750);
    const cur = this.data.ingredients[idx];
    const nx = Math.max(3, Math.min(82, (cur._x || cur.posX) + dx / fw * 100));
    const ny = Math.max(3, Math.min(85, (cur._y || cur.posY) + dy / fh * 100));
    this.setData({
      [`ingredients[${idx}]._x`]: nx,
      [`ingredients[${idx}]._y`]: ny,
    });
    this._touchX = e.touches[0].clientX;
    this._touchY = e.touches[0].clientY;
  },

  onTouchEnd() { this._dragId = null; },

  onIngredientTap(e) {
    if (this._moved) return;
    const item = this.data.ingredients.find(i => i.id === e.currentTarget.dataset.id);
    if (item) this.setData({ selectedIngredient: item, showDetail: true });
  },

  closeDetail() { this.setData({ showDetail: false, selectedIngredient: null }); },
  goEdit() {
    const id = this.data.selectedIngredient?.id;
    this.closeDetail();
    if (id) wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },
  markWaste() {
    const id = this.data.selectedIngredient?.id;
    this.closeDetail();
    if (id) wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },
  goAdd() { wx.navigateTo({ url: '/pages/add/add' }); },
  goStats() { wx.navigateTo({ url: '/pages/stats/stats' }); },
  preventBubble() {},
});
