# OneDrive Organiser

Reorganises a messy OneDrive into the **Jordan Knowledge System** structure —
one root, eleven numbered domains, and a control plane that tells Copilot how to
read the whole thing.

It works on your **locally synced OneDrive folder**, so a few thousand files take
minutes rather than the rest of your life. OneDrive syncs the result to the cloud
afterwards.

---

## The safety model

Read this before you run anything.

| Guarantee | How |
|---|---|
| Nothing moves until you say so | The scanner only writes a CSV. The mover is dry-run by default. |
| Nothing is ever deleted | The scripts only ever call `Move-Item`. There is no delete path. |
| Nothing is ever overwritten | A name collision gets a ` (2)` suffix and is logged. |
| Everything is reversible | Every move is written to `move-log-<timestamp>.csv`, which `Undo-OneDrivePlan.ps1` replays backwards. |
| You get the final say | Anything uncertain is marked `review` and sits still until you change it to `move`. |

---

## Running it

Open PowerShell and `cd` to this folder. Replace the path below with your real
OneDrive path (find it by right-clicking the OneDrive folder → Copy as path).

### Step 1 — Scan, and look at what it plans to do

```powershell
.\Build-OneDrivePlan.ps1 -SourceRoot "C:\Users\<you>\OneDrive - Stryker"
```

Writes two files into `out\`:

- **`plan.csv`** — one row per file: where it is, where it would go, and why
- **`summary.md`** — counts by destination, everything flagged for review, and
  everything it could not classify

**Open `plan.csv` in Excel and read it.** This is the whole point of the tool: you
review a spreadsheet once instead of dragging files for a fortnight.

To change a decision, edit the row:

- Change **`Action`** to `skip` to leave a file where it is
- Change **`Action`** to `move` to approve something marked `review`
- Change **`ProposedPath`** to send a file somewhere else entirely

Save it as CSV (Excel will nag; keep CSV).

### Step 2 — Build the folder structure and control plane

```powershell
.\New-ControlPlane.ps1 -SourceRoot "C:\Users\<you>\OneDrive - Stryker"
```

Creates the eleven top-level folders and writes the control-plane documents:
start-here README, system index, AI operating guide, canonical source map,
metadata standard, notebook catalogue, skill registry, archive policy, decision
log, changelog, and a `SKILL.md` template.

Safe to re-run — it never overwrites an existing file unless you pass `-Force`.

### Step 3 — Move a small batch as a confidence test

```powershell
.\Invoke-OneDrivePlan.ps1 -Limit 25 -Execute
```

Twenty-five files. Go and look at them in Explorer. If it looks wrong, undo it
(step 5) and tune the rules.

### Step 4 — Move everything

```powershell
.\Invoke-OneDrivePlan.ps1 -Execute
```

You will be asked to type `MOVE` to confirm.

**Before you do:** pause OneDrive sync (click the cloud icon → gear → Pause
syncing → 2 hours), run the move, then resume. Moving a few thousand files with
sync running works, it is just slower and noisier. Expect a decent sync
afterwards, so run it when the laptop can stay on.

Files stored online-only are fine — moving a placeholder does not download it.

### Step 5 — Undo, if you hate it

```powershell
.\Undo-OneDrivePlan.ps1 -LogPath ".\out\move-log-20260815-101500.csv" -Execute
```

Puts every file back where it came from. Use the actual log filename that the
mover printed at the end of its run.

---

## Tuning what goes where

All the routing logic is in **`rules.json`** — no PowerShell required.

Rules are checked **top to bottom, first match wins**, so specific rules go above
general ones. Each rule can match on:

- `pathMatches` — regex on the relative path, e.g. `(?i)work[ _\-]?order`
- `nameMatches` — regex on the filename only, e.g. `(?i)^SKILL\.md$`
- `extIn` — a list of extensions, e.g. `[".pdf", ".docx"]`

And routes to a `destination`, which supports these tokens:

| Token | Becomes |
|---|---|
| `{hospital}` | resolved hospital ID, e.g. `gold-coast-private` |
| `{parent}` | the file's parent folder name, kebab-cased |
| `{year}` / `{month}` | from the file's last-modified date |

### Getting hospital folders named correctly

The scanner reads hospital IDs and aliases from any `_index.json` it finds, so
`Accounts\Brisbane Private Hospital\` correctly becomes
`30_Hospital_Accounts\brisbane-private`.

If your index lives somewhere it cannot find, drop a `hospitals.json` next to
these scripts:

```json
{
  "hospitals": [
    { "id": "gold-coast-private", "name": "Gold Coast Private Hospital", "aliases": ["GCP"] }
  ]
}
```

### The fastest way to improve the rules

Run the scan, open `out\summary.md`, scroll to the **Unclassified** section, and
paste that list into Claude. It reads as "here are 200 files I could not place" —
and new rules come back to drop straight into `rules.json`.

---

## Built-in behaviours worth knowing

- **Scripts are not knowledge.** Anything `.ps1 .py .bat .cmd .sh .exe .msi` goes
  to `80_AI_Agents_Skills\_run-locally\` so Copilot never mistakes a script for a
  fact about your territory.
- **Duplicates self-identify.** Files named `... - Copy.xlsx`, `final_final.pptx`,
  `plan OLD.xlsx`, `(2).pdf` route to `90_Archive\<year>\` rather than competing
  with the current version during retrieval.
- **Age-based archiving is opt-in.** Add `-ArchiveOlderThanDays 730` to the scan
  to sweep anything untouched for two years into the archive.
- **Long paths are flagged, not broken.** Anything over 250 characters is marked
  `review` so Windows does not fail the move halfway.
- **Junk is skipped entirely:** `~$` Office temp files, `desktop.ini`, `Thumbs.db`,
  `.tmp`, `.lnk`, and anything already inside the target root.

---

## After the migration

1. Empty `99_Inbox_Processing\_unsorted\` — whatever landed there needs either a
   human decision or a new rule.
2. Merge the duplicate skills the blueprint calls out: `email-agent` +
   `email-triage` → `email-comms`; `tech-services-agent` + `tech-services-ops` →
   `service-ops`; `cheatsheet-builder` + `stryker-cheatsheet-pptx` →
   `training-content`. Keep `quote-copilot` and `proposal-builder` separate.
3. Build each Copilot Notebook's source pack from
   `00_AI_Control_Plane\06_NOTEBOOK_CATALOG.md`. Add specific current files, not
   whole folders — Copilot grounds on roughly 300 files per notebook, and
   precision beats volume.
4. Delete the now-empty old folders by hand. The scripts deliberately do not.

---

## Requirements

Windows PowerShell 5.1 (built into Windows) or PowerShell 7+. No modules, no
admin rights, no network calls. Tested end to end on PowerShell 7.4.
