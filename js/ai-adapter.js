// AI Adapter — stub module. No live AI calls happen from this frontend.
//
// Current workflow (clipboard):
//   1. buildPrompt() assembles the prompt string.
//   2. providers.js copies it to clipboard.
//   3. User pastes into Claude / ChatGPT / Copilot.
//
// Why no API keys in frontend JS?
//   Any key in a static HTML/JS file is public. Anyone who views source,
//   checks DevTools, or downloads the page can extract it. Never store
//   Anthropic / OpenAI / Azure keys here.
//
// Future adapter options (pick one when ready):
//
//   A. Google Apps Script proxy
//      - Deploy a Web App that accepts POST {prompt, model}
//      - Key lives in the Apps Script environment, not the frontend
//      - Free tier is generous for solo use
//
//   B. Power Automate HTTP flow
//      - HTTP trigger -> call Azure OpenAI or OpenAI connector
//      - Fits within an existing Microsoft 365 toolchain
//      - May need IT approval for external connectors
//
//   C. Cloudflare Worker
//      - Tiny serverless function at the edge, ~free tier
//      - Key stored as a Worker secret (env var)
//      - Returns streamed response to the app
//
//   D. Ollama (local desktop)
//      - Run Claude or Llama locally via Ollama
//      - Endpoint: http://localhost:11434/api/generate
//      - Zero cloud dependency, zero cost, works offline
//      - Best for sensitive patient or commercial data
//
//   E. Grok via xAI API (future)
//      - When xAI releases a production-ready API key model
//      - Same pattern as OpenAI — proxy via option A, B, or C above
//
// To activate an adapter: implement sendToAI() below and remove the throw.

/**
 * Send a prompt to an AI backend and return the response text.
 * Not yet implemented — use clipboard workflow via providers.js.
 *
 * @param {string} prompt   - The full prompt string.
 * @param {object} [opts]   - Optional: { model, maxTokens, stream }
 * @returns {Promise<string>}
 */
export async function sendToAI(prompt, opts = {}) {
  throw new Error(
    'sendToAI is not yet connected. Use the clipboard workflow: ' +
    'copyAndOpen() in providers.js copies the prompt and opens the AI app.'
  );
}
