// config.sample.js — TEMPLATE ONLY. Safe to commit (contains no real values).
//
// SECURITY MODEL
// JP Hub's public GitHub Pages frontend is UI-only. It must never contain
// real endpoints, API keys, tokens, or operational data.
//
// All private values live in ONE of two places — never in this repo:
//   1. The in-app Settings screen → saved to localStorage on your device.
//   2. (Optional, local dev only) config.local.js → gitignored.
//
// This file documents the shape of the runtime settings object so future
// you (or an AI agent) knows what each field is for.

export const SETTINGS_TEMPLATE = {
  // Power Automate "When an HTTP request is received" trigger URL.
  // PHASE 2 ONLY — leave blank until the backend HTTP flows exist.
  endpoint: '',

  // Shared secret sent as the `x-api-key` header on every backend call.
  // The Power Automate flow rejects any request without it.
  apiKey: '',

  // Personal share link to your private OneDrive TerritoryOS folder.
  oneDriveLink: '',

  // Optional Outlook web link. The app deep-links to the Outlook app first
  // and only falls back to this URL if the app does not launch.
  outlookLink: '',

  // Name/title injected into escalation prompts via the {{recipient}} token.
  // Kept here (device-local) so no real names live in the public repo.
  escalationRecipient: '',
};
