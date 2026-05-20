import { saveDebrief, loadDebriefs, deleteDebrief, getRecentHospitals } from './storage.js';
import { showToast, esc, fmtTime } from './ui.js';
import { sendHubCommand } from './ai-adapter.js';

export function createDebrief(overrides = {}) {
  return {
    id:        crypto.randomUUID(),
    hospital:  '',
    notes:     '',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function openDebriefModal() {
  const modal = document.getElementById('debriefModal');
  if (!modal) return;

  const hospitals = getRecentHospitals();
  const datalist  = document.getElementById('hospitalSuggestions');
  if (datalist) {
    datalist.innerHTML = hospitals.map(h => `<option value="${esc(h)}">`).join('');
  }

  const hInput = document.getElementById('debriefHospital');
  const nInput = document.getElementById('debriefNotes');
  if (hInput) hInput.value = '';
  if (nInput) nInput.value = '';

  modal.classList.add('open');
  if (hInput) setTimeout(() => hInput.focus(), 120);
}

export function closeDebriefModal() {
  document.getElementById('debriefModal')?.classList.remove('open');
}

export async function submitDebrief() {
  const hospital = document.getElementById('debriefHospital')?.value.trim() || '';
  const notes    = document.getElementById('debriefNotes')?.value.trim()    || '';

  if (!hospital && !notes) {
    showToast('&#9888;', 'Add a hospital or notes first');
    return;
  }

  const debrief = createDebrief({ hospital, notes });
  const record = buildDebriefRecord(hospital, notes);
  saveDebrief(debrief);
  try {
    await sendHubCommand({
      type: 'debrief',
      requestedAgent: 'hospital-context',
      debrief,
      record,
    });
    showToast('✓', 'Debrief sent to Power Automate');
  } catch {
    _exportDebriefJSON(hospital, notes);
    showToast('✓', 'Debrief saved + JSON exported');
  }
  closeDebriefModal();

  if (document.getElementById('todayView')?.classList.contains('active')) {
    window._renderToday?.();
  }
}

// ── JSON EXPORT ──
// Builds a TerritoryOS debrief record and downloads it. Drop the file into
// your private OneDrive TerritoryOS/inbox/ folder — Power Automate picks it
// up from there. The frontend never touches OneDrive directly.

function _slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'no-hospital';
}

export function buildDebriefRecord(hospital, notes) {
  const now      = new Date().toISOString();
  const datePart = now.slice(0, 10);
  const slug     = _slugify(hospital);
  return {
    id:            `deb_${datePart}_${slug}`,
    type:          'debrief',
    schemaVersion: 1,
    createdAt:     now,
    updatedAt:     now,
    data: {
      hospital:     hospital || '',
      hospitalSlug: slug,
      notes:        notes || '',
    },
  };
}

function _exportDebriefJSON(hospital, notes) {
  const record   = buildDebriefRecord(hospital, notes);
  const filename = `${record.createdAt.slice(0, 10)}-${record.data.hospitalSlug}.json`;
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function renderDebriefList(containerId, limit = null) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const list = limit ? loadDebriefs().slice(0, limit) : loadDebriefs();

  if (!list.length) {
    el.innerHTML = `<div class="empty-hint">No debriefs yet</div>`;
    return;
  }

  el.innerHTML = list.map(d => `
    <div class="debrief-card">
      <div class="debrief-header">
        <div class="debrief-hospital">${d.hospital ? esc(d.hospital) : '<span style="color:var(--text3)">No hospital</span>'}</div>
        <div class="debrief-time">${fmtDate(d.createdAt)}</div>
      </div>
      ${d.notes ? `<div class="debrief-notes">${esc(d.notes)}</div>` : ''}
    </div>`).join('');
}

export function initDebriefHandlers() {
  window.openDebrief    = openDebriefModal;
  window.closeDebrief   = closeDebriefModal;
  window.submitDebrief  = submitDebrief;

  window.__deleteDebrief = (id) => {
    deleteDebrief(id);
    showToast('&#128465;', 'Debrief deleted');
    window._renderToday?.();
  };
}

function fmtDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}
