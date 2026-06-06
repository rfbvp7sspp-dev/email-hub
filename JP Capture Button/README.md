# JP Capture Button

One button, one pop-up command centre. Press **Ctrl + Alt + J** and a small
menu appears next to your cursor with quick actions for the clipboard,
screenshots, OCR, Microsoft 365, full-page browser captures, PowerToys and
your everyday work links.

Built with **AutoHotkey v2**. No admin rights needed. Works on any Windows
PC after a one-time setup. Everything you'd want to tweak lives in
`config.ini` — you never have to touch the code.

---

## What's in this folder

| File | What it does |
|------|--------------|
| `JPCaptureButton.ahk` | The main script — the command centre. |
| `config.ini` | Your hotkey, folders, URLs and menu items. Edit this. |
| `lib/ImageToClipboard.ps1` | Helper that copies a saved screenshot onto the clipboard as an image. |
| `README.md` | This file. |

---

## Install (one time)

1. **Install AutoHotkey v2**
   - Go to <https://www.autohotkey.com>, download **v2**, run the installer.
   - You do **not** need admin rights for the default per-user install.
2. **Get this folder onto your PC**
   - Copy the whole `JP Capture Button` folder anywhere you like
     (e.g. `Documents\JP Capture Button`). Keep the files together.
3. **Run it**
   - Double-click `JPCaptureButton.ahk`.
   - A small green-ish icon appears in your system tray (bottom-right,
     near the clock). That means it's running.

That's it. Press **Ctrl + Alt + J** to open the menu.

> The first run automatically creates your capture folders under
> `Documents\JP Capture Button` (Screenshots and Clipboard Saves).

---

## How to run it

- **Manually:** double-click `JPCaptureButton.ahk` any time.
- **From the tray:** right-click the tray icon for quick actions, Reload,
  Edit config, or Exit.
- **The hotkey:** press **Ctrl + Alt + J** whenever the script is running.

---

## Start automatically with Windows

So you never have to remember to launch it:

1. Press **Win + R**, type `shell:startup`, press Enter. The Startup folder
   opens.
2. Right-click `JPCaptureButton.ahk` → **Copy**.
3. In the Startup folder, right-click → **Paste shortcut**.

Now it launches quietly every time you log in. (To stop that, delete the
shortcut from the Startup folder.)

---

## Change the hotkey

Open `config.ini` and edit the `[Hotkeys]` section:

```ini
[Hotkeys]
MainMenu=^!j
```

Hotkey symbols:

| Symbol | Key |
|--------|-----|
| `^` | Ctrl |
| `!` | Alt |
| `+` | Shift |
| `#` | Windows |

Examples: `^!k` = Ctrl+Alt+K · `#j` = Win+J · `^+#m` = Ctrl+Shift+Win+M.

Save the file, then right-click the tray icon → **Reload**.

---

## Map it to a physical button, mouse, or Stream Deck

The whole point is that **Ctrl + Alt + J** is easy to fire from anything:

- **Stream Deck:** add a *Hotkey* action, set it to Ctrl + Alt + J.
- **Gaming mouse / keyboard software** (Logitech, Razer, etc.): bind a
  side button to send the keystroke **Ctrl + Alt + J**.
- **PowerToys Keyboard Manager:** remap a spare key to the shortcut, or use
  a *shortcut to shortcut* mapping.
- **A physical macro key / foot pedal:** program it to send Ctrl + Alt + J.

Because it's a standard keystroke, almost any device that can "send a
keyboard shortcut" can open your command centre.

---

## The menu, action by action

1. **Clipboard preview** — shows the first 500 characters of clipboard text,
   then lets you open it in Notepad, save it as a timestamped `.txt`, or
   clear the clipboard.
2. **Normal screenshot** — full screen to clipboard, region snip, or window
   snip (uses the built-in Windows snip tools).
3. **Screenshot + Microsoft 365** — snip a region, then open Microsoft 365.
   Sub-items also open Outlook, OneDrive, SharePoint and M365 Copilot.
4. **Chrome full-page screenshot** — uses Chrome DevTools "Capture full size
   screenshot", waits for the file in Downloads, copies it to the clipboard
   as an image, and files it into your Screenshots folder.
5. **Edge full-page screenshot** — same idea, for Microsoft Edge.
6. **Extract text from screen (OCR)** — fires PowerToys Text Extractor,
   keeps the result on the clipboard, and offers to save it as `.txt`.
7. **PowerToys quick actions** — Text Extractor, Colour Picker, FancyZones,
   Always on Top, PowerToys Run.
8. **Quick work launchers** — Microsoft 365, Outlook, OneDrive, SharePoint,
   Teams, ChatGPT, Claude, M365 Copilot, GitHub Copilot, VS Code (web).
9. **Save clipboard as file** — text saves as `.txt`, an image saves as
   `.png`, into your Clipboard Saves folder, with a timestamped filename.
10. **Open capture folder** — opens your main JP Capture Button folder.

---

## Change folders, URLs and menu links

All in `config.ini`:

- `[Folders]` — where screenshots and clipboard saves go, and where your
  browser drops downloads. Leave blank to use sensible defaults.
- `[URLs]` — the web links used by the Microsoft 365 menu and Quick work
  launchers. Change any of them to your own tenant/links.
- `[PowerToys]` — must match the shortcuts you've set inside PowerToys.

Save, then Reload from the tray icon.

---

## Test each action

Run the script, then press **Ctrl + Alt + J** and try:

1. **Clipboard preview** — copy some text first (Ctrl+C anywhere), then open
   the menu → *Clipboard preview*. You should see your text.
2. **Normal screenshot** → *Full screen to clipboard*, then paste (Ctrl+V)
   into Paint to confirm.
3. **Screenshot + Microsoft 365** → snip a region; your browser should open
   Microsoft 365.
4. **Chrome full-page** — open Chrome on a long page, then run it. After a
   few seconds you should get a "Saved and copied to clipboard" pop-up, and
   the image should be in your Screenshots folder and pasteable.
5. **Edge full-page** — same, with Edge.
6. **Extract text** — needs PowerToys with Text Extractor on. Run it, drag
   over some on-screen text, then paste to check.
7. **PowerToys quick actions** — try Colour Picker; PowerToys must be
   running.
8. **Quick work launchers** — pick any; the link should open in your
   browser.
9. **Save clipboard as file** — copy text or an image, then run it and check
   the Clipboard Saves folder.
10. **Open capture folder** — Explorer should open your JP Capture Button
    folder.

---

## Troubleshooting

- **Hotkey does nothing** — is the tray icon there? If not, the script isn't
  running. Double-click `JPCaptureButton.ahk`.
- **"PowerToys" messages** — those features (Text Extractor, Colour Picker,
  etc.) need PowerToys installed and running. Get it from the Microsoft
  Store.
- **Browser capture times out** — make sure the browser is open and on the
  page first, the page is fully loaded, and that `DownloadsFolder` in
  `config.ini` points at your real Downloads folder.
- **Changed config but nothing happened** — right-click the tray icon →
  **Reload**.

---

## Notes on how the browser capture works

Chrome and Edge don't have a public "save full page as image to clipboard"
command, so the script uses the built-in DevTools route: open DevTools
(F12), open the command menu (Ctrl+Shift+P), run *Capture full size
screenshot*, and the browser saves a PNG to Downloads. The script then
watches Downloads for that new file, copies it to your clipboard as an
image, and moves it into your Screenshots folder. If the keystroke timing
ever feels too quick on a slow machine, you can nudge the `Sleep` values in
`BrowserFullPage()` upward.
