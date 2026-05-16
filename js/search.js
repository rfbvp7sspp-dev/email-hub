import { loadTasks, getRecents, loadDebriefs } from './storage.js';
import { showView, esc } from './ui.js';

export function initSearch() {
  window.openSearch = () => {
    showView('searchView');
    const input = document.getElementById('searchInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 60);
    }
    _render('');
  };

  window.runSearch = (q) => _render(q);
}

function _render(query) {
  const container = document.getElementById('searchResults');
  if (!container) return;

  const q = query.trim().toLowerCase();

  if (!q) {
    container.innerHTML = `<div class="search-hint">Search tasks, emails, and debriefs</div>`;
    return;
  }

  const tasks   = loadTasks().filter(t =>
    _match(q, t.title, t.sourceSender, t.sourceSubject));

  const emails  = getRecents().filter(e =>
    _match(q, e.sender, e.subject, e.body));

  const debriefs = loadDebriefs().filter(d =>
    _match(q, d.hospital, d.notes));

  const total = tasks.length + emails.length + debriefs.length;

  if (!total) {
    container.innerHTML = `<div class="search-hint">No results for &ldquo;${esc(query)}&rdquo;</div>`;
    return;
  }

  let html = '';

  if (tasks.length) {
    html += `<div class="section-label">Tasks (${tasks.length})</div>`;
    html += tasks.map(t => `
      <div class="sr-card" onclick="window.goTasks()">
        <div class="sr-dot" style="background:#BF5AF2"></div>
        <div class="sr-body">
          <div class="sr-title">${esc(t.title)}</div>
          <div class="sr-meta">${_statusLabel(t.status)}${t.sourceSender ? ' &middot; ' + esc(t.sourceSender) : ''}</div>
        </div>
        <div class="sr-chev">›</div>
      </div>`).join('');
  }

  if (emails.length) {
    html += `<div class="section-label" style="margin-top:12px">Emails (${emails.length})</div>`;
    html += emails.map(e => `
      <div class="sr-card">
        <div class="sr-dot" style="background:#F5A800"></div>
        <div class="sr-body">
          <div class="sr-title">${esc(e.subject)}</div>
          <div class="sr-meta">${esc(e.sender)}</div>
        </div>
        <div class="sr-chev">›</div>
      </div>`).join('');
  }

  if (debriefs.length) {
    html += `<div class="section-label" style="margin-top:12px">Debriefs (${debriefs.length})</div>`;
    html += debriefs.map(d => `
      <div class="sr-card">
        <div class="sr-dot" style="background:#30D158"></div>
        <div class="sr-body">
          <div class="sr-title">${d.hospital ? esc(d.hospital) : '<span style="color:var(--text3)">No hospital</span>'}</div>
          <div class="sr-meta">${d.notes ? esc(d.notes.slice(0, 70)) + (d.notes.length > 70 ? '…' : '') : ''}</div>
        </div>
      </div>`).join('');
  }

  container.innerHTML = html;
}

function _match(q, ...fields) {
  return fields.some(f => f && String(f).toLowerCase().includes(q));
}

function _statusLabel(s) {
  return { todo: 'To Do', 'in-progress': 'In Progress', waiting: 'Waiting', done: 'Done' }[s] || s;
}
