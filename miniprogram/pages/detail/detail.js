const { api } = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    ingredient: null,
    loading: true,
    isEditing: false,
    editForm: {},
    categories: ['蔬菜', '水果', '肉类', '水产', '乳制品', '调料', '主食', '其他'],
    categoryIndex: 0,
    // Partial waste modal
    showWasteModal: false,
    wasteQty: 0,
    wastePercent: 0,
    wasteReason: '吃完了',
    isCountUnit: true, // true=按数量, false=按重量
  },

  onLoad(options) {
    if (options.id) {
      this.loadIngredient(options.id);
    }
  },

  async loadIngredient(id) {
    try {
      const ingredient = await api.getIngredient(id);
      const status = util.getStatus(ingredient.expiry_date);
      const isCount = ['个','盒','瓶','袋','把','颗','根','条','只','块','头','串','杯'].includes(ingredient.unit);
      this.setData({
        ingredient: { ...ingredient, status: status.cls, statusLabel: status.label, statusColor: status.color },
        loading: false,
        isCountUnit: isCount,
        wasteQty: ingredient.quantity,
      });
    } catch (e) {
      this.setData({ loading: false });
      util.showToast(e.message || '加载失败');
    }
  },

  startEdit() {
    const item = this.data.ingredient;
    const catIdx = this.data.categories.indexOf(item.category);
    this.setData({
      isEditing: true,
      editForm: {
        name: item.name,
        category: item.category,
        emoji: item.emoji,
        quantity: item.quantity,
        unit: item.unit,
        purchase_date: item.purchase_date,
        expiry_date: item.expiry_date,
        notes: item.notes || '',
      },
      categoryIndex: catIdx >= 0 ? catIdx : 0,
    });
  },

  cancelEdit() { this.setData({ isEditing: false }); },

  onFormChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`editForm.${field}`]: e.detail.value });
  },

  onCategoryChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({ categoryIndex: idx, 'editForm.category': this.data.categories[idx] });
  },

  async saveEdit() {
    try {
      await api.updateIngredient(this.data.ingredient.id, this.data.editForm);
      util.showToast('保存成功', 'success');
      this.setData({ isEditing: false });
      this.loadIngredient(this.data.ingredient.id);
    } catch (e) { util.showToast(e.message || '保存失败'); }
  },

  async deleteItem() {
    wx.showModal({
      title: '确认删除',
      content: '删除后会记录为浪费，确定吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteIngredient(this.data.ingredient.id, '手动删除');
            util.showToast('已删除', 'success');
            setTimeout(() => wx.navigateBack(), 1000);
          } catch (e) { util.showToast(e.message || '删除失败'); }
        }
      }
    });
  },

  // ── Partial Waste Modal ──
  showWasteModal() {
    const ing = this.data.ingredient;
    this.setData({
      showWasteModal: true,
      wasteQty: this.data.isCountUnit ? Math.ceil(ing.quantity) : ing.quantity,
      wastePercent: 100,
    });
  },

  closeWasteModal() {
    this.setData({ showWasteModal: false });
  },

  onWasteSliderChange(e) {
    const pct = parseInt(e.detail.value);
    const ing = this.data.ingredient;
    let qty;
    if (this.data.isCountUnit) {
      qty = Math.round(ing.quantity * pct / 100);
      if (qty < 1) qty = 1;
    } else {
      qty = Math.round(ing.quantity * pct / 100 * 10) / 10;
    }
    this.setData({ wastePercent: pct, wasteQty: qty });
  },

  onWasteQtyInput(e) {
    let qty = parseFloat(e.detail.value);
    if (isNaN(qty) || qty < 0) qty = 0;
    const ing = this.data.ingredient;
    if (this.data.isCountUnit) qty = Math.round(qty);
    if (qty > ing.quantity) qty = ing.quantity;
    const pct = Math.round(qty / ing.quantity * 100);
    this.setData({ wasteQty: qty, wastePercent: pct });
  },

  onWasteReasonChange(e) {
    this.setData({ wasteReason: e.detail.value });
  },

  async confirmWaste() {
    const ing = this.data.ingredient;
    const wasteQty = this.data.wasteQty;
    if (wasteQty <= 0) {
      util.showToast('请输入有效数量');
      return;
    }

    const reason = this.data.wasteReason || '吃完了';
    const remaining = ing.quantity - wasteQty;

    try {
      if (remaining <= 0.01) {
        // Full waste → delete ingredient
        await api.deleteIngredient(ing.id, reason);
      } else {
        // Partial waste → use markWaste and update quantity
        await api.markWaste(ing.id, { quantity: wasteQty, reason });
      }
      util.showToast(`已记录: 用掉 ${wasteQty}${ing.unit}`, 'success');
      this.setData({ showWasteModal: false });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) {
      util.showToast(e.message || '操作失败');
    }
  },

  preventBubble() {},
});
