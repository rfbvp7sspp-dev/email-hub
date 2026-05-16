// Runtime settings — stored in localStorage on this device only.
// Never committed, never sent anywhere except the user's configured backend.
// See config.sample.js for the meaning of each field.

import { showToast } from './ui.js';

const SETTINGS_KEY = 'jphub_settings';

const DEFAULTS = {
  endpoint:     '',
  apiKey:       '',
  oneDriveLink: '',
  outlookLink:  '',
};

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
  _set('setEndpoint', s.endpoint);
  _set('setApiKey',   s.apiKey);
  _set('setOneDrive', s.oneDriveLink);
  _set('setOutlook',  s.outlookLink);
  document.getElementById('settingsModal')?.classList.add('open');
}

export function closeSettings() {
  document.getElementById('settingsModal')?.classList.remove('open');
}

export function submitSettings() {
  saveSettings({
    endpoint:     _get('setEndpoint'),
    apiKey:       _get('setApiKey'),
    oneDriveLink: _get('setOneDrive'),
    outlookLink:  _get('setOutlook'),
  });
  closeSettings();
  showToast('&#10003;', 'Settings saved on this device');
}

export function initSettingsHandlers() {
  window.openSettings   = openSettings;
  window.closeSettings  = closeSettings;
  window.submitSettings = submitSettings;
}

function _set(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
function _get(id)    { return document.getElementById(id)?.value.trim() || ''; }
