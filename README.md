# JP Hub

A mobile-first web app that turns email JSON files into AI-ready prompts — no login, no API keys, no build step.

---

## What is this

JP Hub reads email JSON files saved by Power Automate, displays them cleanly, and lets you copy a structured prompt to Claude, ChatGPT, or Copilot in one tap. It also has a task list for tracking follow-ups.

---

## How to use on iPhone

1. Open Safari and navigate to the GitHub Pages URL for this repo.
2. Tap **Share** (the box-with-arrow icon at the bottom).
3. Tap **Add to Home Screen**.
4. Name it "JP Hub" and tap **Add**.
5. Open it from your home screen — it runs full screen like a native app.

---

## Add to Home Screen

The app includes a Web App Manifest so iOS treats it as a standalone app with no browser chrome. The status bar blends with the dark theme automatically.

To use icons on the home screen, add two PNG files to the repo root:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

---

## Configure links and identity

Open the in-app **Settings** screen (gear icon, top right of the Today view).
All private values are stored in `localStorage` on your device only — never
committed to this repo:

- **Backend Endpoint** / **API Key** — Power Automate HTTP flow (Phase 2)
- **OneDrive Link** — jump straight to your private folder
- **Outlook Link** — optional; the Outlook button deep-links to the app first
- **Escalation Recipient** — name/title injected into escalation prompts

This repo ships with no links, keys, or names. See `config.sample.js` for the
shape of the runtime settings.

---

## Configure AI provider prompts

Prompt text lives in `js/config.js` under `CONFIG.prompts`. Each action (reply,
summarise, workorder, techservices, task, escalate) has three variants: claude,
chatgpt, and copilot. The escalate prompts use a `{{recipient}}` token that is
filled at runtime from the Settings screen, so no real names live in the repo.

---

## What works now

- Open email JSON files via file picker or paste fallback
- HTML email body stripped to plain text automatically
- Recents list (last 10 emails, persisted in localStorage)
- Copy prompt to clipboard and open Claude / ChatGPT / Copilot in one tap
- Task list: add manually or generate from current email
- Task status tracking (To Do / In Progress / Waiting / Done)
- Offline capable (no network requests at runtime)

---

## What is planned

- Google Sheets sync for tasks (replace localStorage)
- Meeting prep briefing from contact name
- Pipeline summary generator
- Proposal builder
- Salesforce quote template launcher

---

## Why NO API keys in frontend JS

Any key written into a static HTML or JS file is effectively public. Anyone who views source, opens DevTools, or downloads the page can read it. This is true even if the file is "private" on GitHub Pages.

The current workflow avoids this entirely: the app builds the prompt, copies it to clipboard, and opens the AI app. The AI conversation happens in the provider's own authenticated session.

---

## Future Google Sheets sync

The `js/storage.js` module is the only place that reads and writes data. Each exported function (`saveTask`, `loadTasks`, `updateTask`, `deleteTask`) maps directly to one sheet operation. To switch to Google Sheets:

1. Deploy a Google Apps Script Web App with a simple REST API.
2. Replace the `localStorage` calls in `storage.js` with `fetch()` calls to that endpoint.
3. No other files change.

---

## Future AI adapters

The `js/ai-adapter.js` module documents the options. Summary:

| Option | Notes |
|--------|-------|
| Google Apps Script proxy | Free, fits within personal Google account, key stays server-side |
| Power Automate HTTP flow | Fits a Microsoft 365 toolchain, may need IT approval |
| Cloudflare Worker | Free tier, key stored as Worker secret |
| Ollama (local) | Runs Claude or Llama locally, works offline, zero cost |
| Grok / xAI | Future option once API is production-ready |

To activate: implement `sendToAI()` in `ai-adapter.js` and wire it into `app.js`.

---

## Future VS Code Agent Queue handoff

The **Export Task JSON** feature (available on each task card) copies the task as JSON. Paste it into the Claude Code Agent Queue in VS Code to hand off follow-up work to the desktop agent. A formal integration (file watcher or webhook) is planned.
