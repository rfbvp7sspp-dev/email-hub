import { CONFIG } from './config.js';
import { showToast } from './ui.js';

/**
 * Copy prompt to clipboard then open the provider app.
 * Falls back to execCommand for older Safari.
 * @param {string} prompt   - The full prompt text to copy.
 * @param {string} provider - Key from CONFIG.providers.
 */
export function copyAndOpen(prompt, provider) {
  const cfg = CONFIG.providers[provider];
  if (!cfg) {
    showToast('&#9888;', `Unknown provider: ${provider}`);
    return;
  }

  _copyText(prompt)
    .then(() => {
      showToast('&#10003;', `Copied — opening ${cfg.label}`);
      setTimeout(() => openProvider(provider), 950);
    })
    .catch(() => {
      showToast('&#9888;', 'Clipboard blocked — copy manually');
    });
}

/**
 * Open a provider by deep link, falling back to the web URL if the app
 * doesn't open. Uses visibilitychange to detect whether the app launched —
 * if the page goes hidden the app opened, so we skip the web fallback.
 * @param {string} key - Key from CONFIG.providers.
 */
export function openProvider(key) {
  const cfg = CONFIG.providers[key];
  if (!cfg) return;

  let appOpened = false;
  const onHide = () => { appOpened = true; };
  document.addEventListener('visibilitychange', onHide, { once: true });

  window.location.href = cfg.deepLink;

  setTimeout(() => {
    document.removeEventListener('visibilitychange', onHide);
    if (!appOpened) {
      // App didn't open — navigate to web version in the same tab
      // (window.open is always blocked by Safari in a timeout).
      window.location.href = cfg.webUrl;
    }
  }, 1500);
}

// ── INTERNAL ──

function _copyText(text) {
  // Modern API.
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Older Safari fallback via execCommand.
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy') ? resolve() : reject(new Error('execCommand failed'));
    } catch (err) {
      reject(err);
    }
    document.body.removeChild(ta);
  });
}
