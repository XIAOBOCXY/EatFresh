/**
 * Utility functions for AI Fridge Manager.
 */

/** Format date to YYYY-MM-DD */
function formatDate(date) {
  const d = date ? new Date(date) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get date N days from now */
function dateInDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** Calculate days remaining until expiry */
function daysRemaining(expiryDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

/** Calculate freshness percentage */
function calcFreshness(purchaseDate, expiryDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const purchase = new Date(purchaseDate);
  const expiry = new Date(expiryDate);
  const total = (expiry - purchase) / (1000 * 60 * 60 * 24);
  const remaining = (expiry - now) / (1000 * 60 * 60 * 24);
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
}

/** Get freshness status and color */
function getStatus(expiryDate) {
  const days = daysRemaining(expiryDate);
  if (days < 0) return { label: '已过期', color: '#999', cls: 'expired' };
  if (days <= 3) return { label: '即将过期', color: '#FF4D4F', cls: 'urgent' };
  if (days <= 7) return { label: '尽快食用', color: '#FAAD14', cls: 'warning' };
  return { label: '新鲜', color: '#52C41A', cls: 'fresh' };
}

/** Debounce */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/** Toast wrapper */
function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 });
}

module.exports = {
  formatDate,
  dateInDays,
  daysRemaining,
  calcFreshness,
  getStatus,
  debounce,
  showToast,
};
