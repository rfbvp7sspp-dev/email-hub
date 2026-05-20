// AI Adapter / Hub command bridge.
//
// Clipboard workflow still works through providers.js. This module adds the
// missing backend path so JP Hub can send structured commands to Power Automate
// without putting private keys or agent credentials into public GitHub Pages.
//
// Power Automate note:
// Browser calls from GitHub Pages are commonly blocked by CORS unless the flow
// response includes Access-Control-Allow-Origin. For operational commands this
// module sends a simple one-way request that Power Automate still receives.

import { getSettings } from './settings.js';

/**
 * Send a prompt to a configured AI backend and return the response text/object.
 * This requires the Power Automate flow to return CORS headers.
 *
 * @param {string} prompt
 * @param {object} [opts]
 * @returns {Promise<object>}
 */
export async function sendToAI(prompt, opts = {}) {
  return sendHubCommand({
    type: 'ai_prompt',
    prompt,
    model: opts.model || '',
  }, { expectResponse: true });
}

/**
 * Send a structured command to the configured Power Automate endpoint.
 *
 * Default mode is fire-and-forget because static GitHub Pages cannot read most
 * Power Automate responses unless the flow explicitly returns CORS headers.
 * The request body includes apiKey so the flow can validate without requiring
 * a custom browser header/preflight.
 *
 * @param {object} command
 * @param {object} [opts] - { expectResponse?: boolean }
 * @returns {Promise<object>}
 */
export async function sendHubCommand(command, opts = {}) {
  const settings = getSettings();
  const endpoint = settings.endpoint;
  if (!endpoint) {
    throw new Error('Add your Power Automate endpoint in Settings first.');
  }

  const envelope = {
    source: 'jphub',
    schemaVersion: 1,
    sentAt: new Date().toISOString(),
    apiKey: settings.apiKey || '',
    command,
  };

  if (opts.expectResponse) {
    const headers = { 'Content-Type': 'application/json' };
    if (settings.apiKey) headers['x-api-key'] = settings.apiKey;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Backend returned ${response.status}`);
    }
    return text ? JSON.parse(text) : { success: true };
  }

  await fetch(endpoint, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(envelope),
  });

  return { success: true, status: 'sent' };
}
