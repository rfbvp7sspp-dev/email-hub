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
 * Open a provider by deep link, falling back to web URL after a short delay.
 * @param {string} key - Key from CONFIG.providers.
 */
export function openProvider(key) {
  const cfg = CONFIG.providers[key];
  if (!cfg) return;
  window.location.href = cfg.deepLink;
  // If the deep link doesn't launch an app, open the web URL as fallback.
  setTimeout(() => window.open(cfg.webUrl, '_blank'), 1200);
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
