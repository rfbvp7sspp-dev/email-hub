// Email parser — no imports, no dependencies.
// Handles both:
//   - Structured JSON written by normalize-inbound-emails.ps1 (new format)
//   - Invalid JSON that Power Automate writes directly (legacy fallback)

// ── STRUCTURED FORMAT DETECTION ──
// New format: valid JSON with triageStatus, bodyText, receivedAt fields.
function isStructured(parsed) {
  return parsed && typeof parsed === 'object' && 'triageStatus' in parsed;
}

// ── LEGACY EXTRACTOR ──
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

// ── NORMALISE FROM STRUCTURED JSON ──
function normaliseStructured(parsed, filename) {
  const rawFrom = parsed.from || '';
  const isEmail = rawFrom.includes('@');
  const sender  = isEmail
    ? rawFrom.split('@')[0].replace(/[._]/g, ' ')
    : (rawFrom || 'Unknown');

  // bodyText is already plain text from the PS normaliser.
  // Fall back to stripping bodyHtml if bodyText is empty (e.g. long-filename files).
  const body = parsed.bodyText
    ? parsed.bodyText
    : htmlToText(parsed.bodyHtml || '');

  return {
    sender,
    email:         isEmail ? rawFrom : '',
    subject:       parsed.subject || '(No subject)',
    body,
    time:          parsed.receivedAt || '',
    attachments:   Array.isArray(parsed.attachments) ? parsed.attachments : [],
    filename,
    loadedAt:      new Date().toISOString(),
    // Triage metadata — surfaced in the inbox view
    triageStatus:  parsed.triageStatus  || 'new',
    triageReason:  parsed.triageReason  || '',
    triageMatched: parsed.triageMatched || '',
    hospitalId:    parsed.hospitalId    || null,
    emailId:       parsed.id            || null,
  };
}

// ── NORMALISE FROM LEGACY FIELDS ──
function normaliseLegacy(d, filename) {
  const rawFrom = d.from || '';
  const isEmail = rawFrom.includes('@');
  const sender  = isEmail
    ? rawFrom.split('@')[0].replace(/[._]/g, ' ')
    : (rawFrom || 'Unknown');

  return {
    sender,
    email:         isEmail ? rawFrom : '',
    subject:       d.subject || '(No subject)',
    body:          htmlToText(d.body || ''),
    time:          d.received || '',
    attachments:   [],
    filename,
    loadedAt:      new Date().toISOString(),
    triageStatus:  'new',
    triageReason:  '',
    triageMatched: '',
    hospitalId:    null,
    emailId:       null,
  };
}

// ── PUBLIC API ──

/**
 * Parse a raw file text string into a clean email object.
 * Accepts both the new structured JSON format and the legacy PA raw format.
 *
 * @param {string} text     - Raw file contents.
 * @param {string} filename - Original filename, stored for display.
 * @returns {{ sender, email, subject, body, time, attachments, filename,
 *             loadedAt, triageStatus, triageReason, triageMatched, hospitalId, emailId }}
 * @throws {Error} If no recognisable email fields are found.
 */
export function parseEmailFile(text, filename) {
  // Strip UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  // Try structured JSON first (new normalised format).
  try {
    const parsed = JSON.parse(text);
    if (isStructured(parsed)) {
      return normaliseStructured(parsed, filename);
    }
  } catch {
    // Not valid JSON — fall through to legacy extractor.
  }

  // Legacy path: extract fields from malformed PA JSON.
  const data = extractFields(text);
  if (!data.from && !data.subject) {
    throw new Error('Could not find email fields. Is this a Pending Emails JSON file?');
  }
  return normaliseLegacy(data, filename);
}
