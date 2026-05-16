// Email parser — no imports, no dependencies.
// Handles the invalid JSON that Power Automate writes.

// ── CORE PARSER ──
// Power Automate saves invalid JSON: unescaped quotes and literal newlines in body.
// Skip JSON.parse entirely, extract fields directly from raw text.
function extractFields(text) {
  const pluck = (key) => {
    const m = text.match(new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"'));
    return m ? m[1] : '';
  };
  const from     = pluck('from');
  const subject  = pluck('subject');
  const received = pluck('received');
  let body = '';
  const bodyStart = text.indexOf('"body":"');
  const bodyEnd   = text.lastIndexOf('","received"');
  if (bodyStart !== -1 && bodyEnd > bodyStart) {
    body = text.slice(bodyStart + 8, bodyEnd);
  } else if (bodyStart !== -1) {
    body = text.slice(bodyStart + 8, text.lastIndexOf('"}'));
  }
  return { from, subject, body, received };
}

// ── HTML STRIP ──
// Email bodies are untrusted external content. DOMParser produces an inert
// document — no resource loads, no event handlers (e.g. <img onerror>), no
// script execution — so parsing crafted HTML cannot run code in this origin.
// Never use innerHTML here: that fires inline handlers on assignment.
function htmlToText(html) {
  if (!html || !html.trim().startsWith('<')) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style').forEach(el => el.remove());
  doc.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
  doc.querySelectorAll('p, div').forEach(el => el.prepend('\n'));
  return doc.body.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

// ── NORMALISE ──
// Converts raw extracted fields into a clean email object.
function normalise(d, filename) {
  const rawFrom = d.from || '';
  const isEmail = rawFrom.includes('@');
  const sender  = isEmail
    ? rawFrom.split('@')[0].replace(/[._]/g, ' ')
    : (rawFrom || 'Unknown');
  const email   = isEmail ? rawFrom : '';

  return {
    sender,
    email,
    subject:     d.subject || '(No subject)',
    body:        htmlToText(d.body || ''),
    time:        d.received || '',
    attachments: [],
    filename,
    loadedAt:    new Date().toISOString(),
  };
}

// ── PUBLIC API ──

/**
 * Parse a raw file text string into a clean email object.
 * @param {string} text     - Raw file contents (may be invalid JSON).
 * @param {string} filename - Original filename, stored for display.
 * @returns {{ sender, email, subject, body, time, attachments, filename, loadedAt }}
 * @throws {Error} If no recognisable email fields are found.
 */
export function parseEmailFile(text, filename) {
  // Strip UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const data = extractFields(text);

  if (!data.from && !data.subject) {
    throw new Error('Could not find email fields. Is this a Pending Emails JSON file?');
  }

  return normalise(data, filename);
}
