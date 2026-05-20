// UI utilities — no imports, no dependencies.

// ── TOAST ──

let _toastTimer = null;

/**
 * Show a brief toast notification at the bottom of the screen.
 * @param {string} icon - HTML entity or emoji for the leading icon.
 * @param {string} msg  - Message text.
 */
export function showToast(icon, msg) {
  const el      = document.getElementById('toast');
  const iconEl  = document.getElementById('toastIcon');
  const msgEl   = document.getElementById('toastMsg');
  if (!el) return;
  iconEl.innerHTML  = icon;
  msgEl.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── CLOCK ──

/**
 * Start a live clock updating every 30 seconds.
 * @param {string} id - Element ID to write into.
 */
export function startClock(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-AU', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };
  tick();
  setInterval(tick, 30000);
}

// ── VIEW SWITCHER ──

const VIEW_IDS = ['todayView', 'inboxView', 'emailView', 'composeView', 'tasksView', 'searchView'];

const TAB_MAP = {
  todayView:  'tab-today',
  inboxView:  'tab-inbox',
  tasksView:  'tab-tasks',
  searchView: 'tab-search',
};

export function showView(viewId) {
  VIEW_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === viewId);
  });

  Object.entries(TAB_MAP).forEach(([view, tabId]) => {
    document.getElementById(tabId)?.classList.toggle('active', view === viewId);
  });
}

// ── UTILS ──

/**
 * HTML-escape a string for safe insertion into innerHTML.
 * @param {string} s
 * @returns {string}
 */
export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Derive up to 2 initials from a display name.
 * @param {string} name
 * @returns {string}
 */
export function initials(name) {
  const parts = String(name).trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : String(name).slice(0, 2).toUpperCase();
}

/**
 * Format a raw date/time string for display. Returns the original string if unparseable.
 * @param {string} raw
 * @returns {string}
 */
export function fmtTime(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}
