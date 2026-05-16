import { CONFIG } from './config.js';
import { getSettings } from './settings.js';

/**
 * Build the standard email context block that gets appended to every prompt.
 * @param {object} email - Normalised email object from parseEmailFile.
 * @returns {string}
 */
export function buildEmailContext(email) {
  let s = `From: ${email.sender}`;
  if (email.email) s += ` <${email.email}>`;
  s += `\nSubject: ${email.subject}`;
  if (email.time) s += `\nReceived: ${email.time}`;
  if (email.attachments && email.attachments.length) {
    s += `\nAttachments: ${email.attachments.join(', ')}`;
  }
  return s + `\n\n${email.body}`;
}

/**
 * Build the full prompt string for a given action and provider.
 * @param {string} action   - Key from CONFIG.prompts (e.g. 'reply', 'summarise').
 * @param {object} email    - Normalised email object.
 * @param {string} provider - Key from CONFIG.providers (e.g. 'claude', 'chatgpt').
 * @returns {string}
 */
export function buildPrompt(action, email, provider) {
  const group = CONFIG.prompts[action];
  if (!group) throw new Error(`Unknown action: ${action}`);
  const fn = group[provider] || group.claude;
  const recipient = getSettings().escalationRecipient || 'my manager';
  return fn(buildEmailContext(email)).replace(/\{\{recipient\}\}/g, () => recipient);
}
