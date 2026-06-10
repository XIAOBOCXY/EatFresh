const { api } = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    mode: 'chat',
    inputText: '',
    canSend: false,
    parsedItems: [],
    selectedTags: [],     // 标签选择
    presets: {},          // 预置标签
    presetCategories: [], // 分类列表
    activeCategory: '',
    isProcessing: false,
    showTagModal: false,
    tagModalItem: null,
    tagQty: 1,
    tagUnit: '个',
    tagExpiryDays: 7,
  },

  onLoad() {
    this.loadPresets();
  },

  async loadPresets() {
    try {
      const data = await api.getPresets();
      const categories = data.categories || {};
      this.setData({
        presets: categories,
        presetCategories: Object.keys(categories),
        activeCategory: Object.keys(categories)[0] || '',
      });
    } catch (e) {
      console.log('Load presets failed:', e);
    }
  },

  switchMode(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({ mode });
  },

  // ── Chat Mode ──
  onInputChange(e) {
    const val = e.detail.value;
    this.setData({ inputText: val, canSend: val.trim().length > 0 });
  },

  async sendText() {
    const text = this.data.inputText.trim();
    if (!text) {
      util.showToast('请输入食材描述');
      return;
    }

    this.setData({ isProcessing: true });
    try {
      const result = await api.parseText(text);
      if (!result || result.length === 0) {
        util.showToast('未能识别到食材，请换个说法试试');
        this.setData({ isProcessing: false });
        return;
      }
      this.setData({
        parsedItems: result,
        inputText: '',
        isProcessing: false,
      });
    } catch (e) {
      this.setData({ isProcessing: false });
      util.showToast(e.message || 'AI 解析失败');
    }
  },

  editParsedItem(e) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.parsedItems[index];
    wx.showModal({
      title: `编辑 ${item.name}`,
      editable: true,
      placeholderText: '名称',
      content: item.name,
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ [`parsedItems[${index}].name`]: res.content });
        }
      }
    });
  },

  editParsedQty(e) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.parsedItems[index];
    wx.showModal({
      title: `修改数量 (当前: ${item.quantity}${item.unit})`,
      editable: true,
      placeholderText: '输入数量',
      content: String(item.quantity),
      success: (res) => {
        if (res.confirm && res.content && !isNaN(res.content)) {
          this.setData({ [`parsedItems[${index}].quantity`]: parseFloat(res.content) });
        }
      }
    });
  },

  editParsedExpiry(e) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.parsedItems[index];
    wx.showModal({
      title: `修改保质期 (当前: ${item.typical_expiry_days}天)`,
      editable: true,
      placeholderText: '输入天数',
      content: String(item.typical_expiry_days),
      success: (res) => {
        if (res.confirm && res.content && !isNaN(res.content)) {
          const days = parseInt(res.content);
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + days);
          this.setData({
            [`parsedItems[${index}].typical_expiry_days`]: days,
            [`parsedItems[${index}].expiry_date`]: util.formatDate(expiry),
          });
        }
      }
    });
  },

  removeParsedItem(e) {
    const { index } = e.currentTarget.dataset;
    const items = this.data.parsedItems.filter((_, i) => i !== index);
    this.setData({ parsedItems: items });
  },

  async confirmParsedItems() {
    if (this.data.parsedItems.length === 0) {
      util.showToast('没有可入库的食材');
      return;
    }
    try {
      await api.batchAddIngredients(this.data.parsedItems);
      util.showToast(`成功入库 ${this.data.parsedItems.length} 个食材`, 'success');
      this.setData({ parsedItems: [] });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) {
      util.showToast(e.message || '入库失败');
    }
  },

  // ── Tag Mode ──
  onCategoryTap(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.cat });
  },

  onTagTap(e) {
    const { item } = e.currentTarget.dataset;
    this.setData({
      showTagModal: true,
      tagModalItem: item,
      tagQty: 1,
      tagUnit: item.unit || '个',
      tagExpiryDays: item.expiry_days || 7,
    });
  },

  closeTagModal() {
    this.setData({ showTagModal: false, tagModalItem: null });
  },

  onTagQtyChange(e) {
    this.setData({ tagQty: parseFloat(e.detail.value) || 1 });
  },

  onTagExpiryChange(e) {
    this.setData({ tagExpiryDays: parseInt(e.detail.value) || 7 });
  },

  addTagItem() {
    const { tagModalItem, tagQty, tagUnit, tagExpiryDays } = this.data;
    if (!tagModalItem) return;

    const newItem = {
      name: tagModalItem.name,
      category: tagModalItem.category,
      emoji: tagModalItem.emoji,
      quantity: tagQty,
      unit: tagUnit,
      purchase_date: util.formatDate(),
      expiry_date: util.dateInDays(tagExpiryDays),
    };

    const exists = this.data.selectedTags.findIndex(t => t.name === newItem.name);
    if (exists >= 0) {
      const updated = [...this.data.selectedTags];
      updated[exists] = newItem;
      this.setData({ selectedTags: updated, showTagModal: false, tagModalItem: null });
    } else {
      this.setData({
        selectedTags: [...this.data.selectedTags, newItem],
        showTagModal: false,
        tagModalItem: null,
      });
    }
  },

  removeTagItem(e) {
    const { index } = e.currentTarget.dataset;
    const items = this.data.selectedTags.filter((_, i) => i !== index);
    this.setData({ selectedTags: items });
  },

  async confirmTagItems() {
    if (this.data.selectedTags.length === 0) {
      util.showToast('请选择食材');
      return;
    }
    try {
      await api.batchAddIngredients(this.data.selectedTags);
      util.showToast(`成功入库 ${this.data.selectedTags.length} 个食材`, 'success');
      this.setData({ selectedTags: [] });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) {
      util.showToast(e.message || '入库失败');
    }
  },
});
