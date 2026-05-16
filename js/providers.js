import { CONFIG } from './config.js';
import { showToast } from './ui.js';

/**
 * Copy prompt to clipboard then open the provider in a separate tab,
 * leaving JP Hub open in its own tab.
 * @param {string} prompt   - The full prompt text to copy.
 * @param {string} provider - Key from CONFIG.providers.
 */
export function copyAndOpen(prompt, provider) {
  const cfg = CONFIG.providers[provider];
  if (!cfg) {
    showToast('&#9888;', `Unknown provider: ${provider}`);
    return;
  }

  // Reserve the new tab synchronously inside the click gesture, otherwise
  // the browser blocks it as a popup once the clipboard promise resolves.
  const tab = window.open('', '_blank');

  _copyText(prompt)
    .then(() => {
      showToast('&#10003;', `Copied — opening ${cfg.label}`);
      if (tab) tab.location.href = cfg.webUrl;
      else window.open(cfg.webUrl, '_blank'); // popup blocked — best effort
    })
    .catch(() => {
      if (tab) tab.close();
      showToast('&#9888;', 'Clipboard blocked — copy manually');
    });
}

/**
 * Open a provider's web version in a separate tab.
 * @param {string} key - Key from CONFIG.providers.
 */
export function openProvider(key) {
  const cfg = CONFIG.providers[key];
  if (!cfg) return;
  window.open(cfg.webUrl, '_blank');
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
