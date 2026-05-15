// Local storage adapter for recents and tasks.
// No imports — this module has no dependencies.
//
// Future: replace localStorage calls here with a Google Sheets adapter.
// Each exported function maps to one sheet operation:
//   saveRecent   -> appendRow(RECENTS_SHEET, email)
//   getRecents   -> getRows(RECENTS_SHEET)
//   saveTask     -> appendRow(TASKS_SHEET, task)
//   loadTasks    -> getRows(TASKS_SHEET)
//   updateTask   -> updateRow(TASKS_SHEET, id, changes)
//   deleteTask   -> deleteRow(TASKS_SHEET, id)

const RECENTS_KEY = 'jphub_recents';
const TASKS_KEY   = 'jphub_tasks';
const MAX_RECENTS = 10;

// ── RECENTS ──

export function saveRecent(email) {
  // Deduplicate by sender+subject so re-opening the same email moves it to top.
  const list = getRecents().filter(
    r => !(r.sender === email.sender && r.subject === email.subject)
  );
  list.unshift(email);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
  } catch {
    // Storage full — silently skip.
  }
}

export function getRecents() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

// ── TASKS ──

export function saveTask(task) {
  const tasks = loadTasks();
  tasks.unshift(task);
  _writeTasks(tasks);
}

export function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function updateTask(id, changes) {
  const tasks = loadTasks().map(t => t.id === id ? { ...t, ...changes } : t);
  _writeTasks(tasks);
}

export function deleteTask(id) {
  _writeTasks(loadTasks().filter(t => t.id !== id));
}

function _writeTasks(tasks) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // Storage full — silently skip.
  }
}
