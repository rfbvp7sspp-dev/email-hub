import { CONFIG } from './config.js';
import { showToast } from './ui.js';

/**
 * Copy prompt to clipboard then launch the provider's native app.
 * The deep link is opened via window.open so the JP Hub page is never
 * replaced — JP Hub stays alive in the background and is one swipe away.
 * @param {string} prompt   - The full prompt text to copy.
 * @param {string} provider - Key from CONFIG.providers.
 */
export function copyAndOpen(prompt, provider) {
  const cfg = CONFIG.providers[provider];
  if (!cfg) {
    showToast('&#9888;', `Unknown provider: ${provider}`);
    return;
  }

  // Fire the clipboard write inside the click gesture.
  _copyText(prompt)
    .then(() => showToast('&#10003;', `Copied — opening ${cfg.label}`))
    .catch(() => showToast('&#9888;', 'Clipboard blocked — copy manually'));

  openProvider(provider);
}

/**
 * Launch a provider's native app via its deep link, opened in a separate
 * tab so the JP Hub page is preserved. If the app doesn't launch within
 * 1.5s, that tab falls back to the provider's web version.
 * @param {string} key - Key from CONFIG.providers.
 */
export function openProvider(key) {
  const cfg = CONFIG.providers[key];
  if (!cfg) return;

  let appOpened = false;
  const onHide = () => { appOpened = true; };
  document.addEventListener('visibilitychange', onHide, { once: true });

  const tab = window.open(cfg.deepLink, '_blank');

  setTimeout(() => {
    document.removeEventListener('visibilitychange', onHide);
    if (!appOpened && tab && !tab.closed) {
      tab.location.href = cfg.webUrl;
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
