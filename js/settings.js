// Runtime settings — stored in localStorage on this device only.
// Never committed, never sent anywhere except the user's configured backend.
// See config.sample.js for the meaning of each field.

import { showToast } from './ui.js';

const SETTINGS_KEY = 'jphub_settings';

const DEFAULTS = {
  endpoint:            '',
  apiKey:              '',
  oneDriveLink:        '',
  outlookLink:         '',
  escalationRecipient: '',
};

// Operational data keys — cleared by the "Clear local data" control.
// jphub_settings is intentionally excluded so config survives a purge.
const DATA_KEYS = ['jphub_recents', 'jphub_tasks', 'jphub_debriefs'];

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function openSettings() {
  const s = getSettings();
  _set('setEndpoint',   s.endpoint);
  _set('setApiKey',     s.apiKey);
  _set('setOneDrive',   s.oneDriveLink);
  _set('setOutlook',    s.outlookLink);
  _set('setEscalation', s.escalationRecipient);
  document.getElementById('settingsModal')?.classList.add('open');
}

export function closeSettings() {
  document.getElementById('settingsModal')?.classList.remove('open');
}

export function submitSettings() {
  saveSettings({
    endpoint:            _get('setEndpoint'),
    apiKey:              _get('setApiKey'),
    oneDriveLink:        _get('setOneDrive'),
    outlookLink:         _get('setOutlook'),
    escalationRecipient: _get('setEscalation'),
  });
  closeSettings();
  showToast('&#10003;', 'Settings saved on this device');
}

// Purge cached operational data from this device. Settings are kept.
export function clearLocalData() {
  DATA_KEYS.forEach(k => {
    try { localStorage.removeItem(k); } catch {}
  });
}

export function initSettingsHandlers() {
  window.openSettings   = openSettings;
  window.closeSettings  = closeSettings;
  window.submitSettings = submitSettings;

  window.clearLocalData = () => {
    const ok = confirm(
      'Clear cached emails, tasks, and debriefs from this device?\n\n' +
      'Your Settings are kept. This cannot be undone.'
    );
    if (!ok) return;
    clearLocalData();
    showToast('&#128465;', 'Local data cleared');
    setTimeout(() => location.reload(), 700);
  };
}

function _set(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
function _get(id)    { return document.getElementById(id)?.value.trim() || ''; }
