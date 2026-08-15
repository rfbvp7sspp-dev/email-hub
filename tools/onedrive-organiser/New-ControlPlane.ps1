<#
.SYNOPSIS
    Creates the folder skeleton and the 00_AI_Control_Plane canonical files.

.DESCRIPTION
    Builds "Jordan Knowledge System" under -SourceRoot with all eleven top-level
    folders, a README in each, and the control-plane documents that tell Copilot
    (and any other agent) how the system is meant to work.

    Safe to re-run: existing files are left alone unless you pass -Force.

.EXAMPLE
    .\New-ControlPlane.ps1 -SourceRoot "C:\Users\jpereira\OneDrive - Stryker"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SourceRoot,

    [string]$RulesPath = (Join-Path $PSScriptRoot 'rules.json'),
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

if (-not (Test-Path -LiteralPath $SourceRoot)) { throw "SourceRoot not found: $SourceRoot" }

$rules  = Get-Content -LiteralPath $RulesPath -Raw -Encoding UTF8 | ConvertFrom-Json
$root   = Join-Path (Resolve-Path -LiteralPath $SourceRoot).Path $rules.targetRoot
$today  = Get-Date -Format 'yyyy-MM-dd'
$made   = 0
$kept   = 0

function New-Doc {
    param([string]$Path, [string]$Content)

    $dir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    if ((Test-Path -LiteralPath $Path) -and -not $script:Force) {
        Write-Host "  kept    $([System.IO.Path]::GetFileName($Path))" -ForegroundColor DarkGray
        $script:kept++
        return
    }
    Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
    Write-Host "  created $([System.IO.Path]::GetFileName($Path))" -ForegroundColor Green
    $script:made++
}

Write-Host ""
Write-Host "Building control plane at: $root" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------ folders

$folderPurpose = [ordered]@{
    '00_AI_Control_Plane'          = 'Start here. Indexes, source map, metadata rules, skill registry, decision log.'
    '10_Territory_Intelligence'    = 'Territory strategy, business plans, pipeline, forecasts, QBR inputs.'
    '20_Product_Clinical_Knowledge'= 'Product families, IFUs, quick guides, clinical evidence and claims.'
    '30_Hospital_Accounts'         = 'One folder per hospital. Account facts, briefings, relationship maps.'
    '40_Workflows_Operations'      = 'Repeatable operational workflows: email, debrief, meeting prep, Power Automate, Concur.'
    '50_Quotes_Proposals'          = 'Quote inputs, CPQ checklists, proposal outputs, sent proposals.'
    '60_Training_CheatSheets'      = 'Theatre education: cheat sheets, in-service decks, workflow cards, templates.'
    '70_Service_Tech_Ops'          = 'Work orders, repairs, loan units, scope exchange, ProCare, PO chasing.'
    '80_AI_Agents_Skills'          = 'Skills, prompts, agent definitions, shared rules. Scripts live in _run-locally.'
    '90_Archive'                   = 'Superseded and historical material. Never deleted, never in a default notebook.'
    '99_Inbox_Processing'          = 'Temporary capture zone. Should trend towards empty.'
}

foreach ($name in $folderPurpose.Keys) {
    $path = Join-Path $root $name
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "  folder  $name" -ForegroundColor Green
    }
    New-Doc -Path (Join-Path $path '_README.md') -Content @"
# $name

$($folderPurpose[$name])

## What belongs here

See ``00_AI_Control_Plane/01_SYSTEM_INDEX.md`` for the full rule.

## What does not belong here

Anything that is the source of truth for another domain. Link to it instead of
copying it. One fact, one home.

_Last reviewed: $($today)_
"@
}

New-Item -ItemType Directory -Path (Join-Path (Join-Path $root '80_AI_Agents_Skills') '_run-locally') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path (Join-Path $root '99_Inbox_Processing') '_unsorted') -Force | Out-Null

# ------------------------------------------------------------ control plane

$cp = Join-Path $root '00_AI_Control_Plane'
$nl = [Environment]::NewLine

# Precomputed so the here-strings below stay free of nested expressions.
$mapRows = ($folderPurpose.Keys | ForEach-Object {
    '| `' + $_ + '` | ' + $folderPurpose[$_] + ' |'
}) -join $nl

$indexSections = ($folderPurpose.Keys | ForEach-Object {
    '## ' + $_ + $nl + $nl +
    $folderPurpose[$_] + $nl + $nl +
    '- **Belongs:** _fill in as the system settles_' + $nl +
    "- **Does not belong:** anything that is another folder's source of truth" + $nl
}) -join $nl

New-Doc -Path (Join-Path $cp '00_README_START_HERE.md') -Content @"
# Jordan Knowledge System

One root. Everything underneath is one of five things: **facts**, **workflows**,
**reference material**, **outputs**, or **archives**.

## The map

| Folder | Holds |
|---|---|
$mapRows

## Rules that matter most

1. **One source of truth per fact.** If a fact appears twice, one copy is a link.
2. **Archive, never delete.** Mark superseded, move to ``90_Archive``.
3. **Current beats old.** Notebooks only ever point at ``status: current`` files.
4. **No patient-identifiable information.** No names, MRNs, DOBs, procedure IDs.
5. **No unsupported clinical claims.** Claims trace to an approved reference.
6. **Scripts are not knowledge.** Anything runnable lives in ``_run-locally``.

## If you are an AI reading this

Start with ``04_CANONICAL_SOURCE_MAP.md`` to find the authoritative file for the
fact you need. Do not infer facts from decks or proposals when an index exists.
If the answer is not in a canonical source, say so rather than guessing.

_Last reviewed: $($today)_
"@

New-Doc -Path (Join-Path $cp '01_SYSTEM_INDEX.md') -Content @"
# System index

What belongs in each folder, and what does not.

$indexSections

_Last reviewed: $($today)_
"@

New-Doc -Path (Join-Path $cp '02_AI_OPERATING_GUIDE.md') -Content @"
# AI operating guide

How any assistant should behave inside this system.

## Retrieval order

1. Check ``04_CANONICAL_SOURCE_MAP.md`` for the authoritative source.
2. Read the structured index (JSON or XLSX) before reading narrative documents.
3. Only fall back to PDFs, decks and emails when the index does not cover it.
4. Ignore anything under ``90_Archive`` unless explicitly asked for history.

## Answering rules

- Product codes, pricing, quantities, discounts and scope come from validated
  sources or get flagged as unknown. Never invented.
- Clinical claims need a reference: peer-reviewed article, clinical guideline,
  regulatory document, published trial result, or post-market evidence.
- Off-label questions go to the Clinical Operations process, not to the model.
- When two sources disagree, prefer the one marked ``status: current`` and say
  that a conflict exists.

## Writing rules

Shared tone and formatting rules live in
``80_AI_Agents_Skills/_shared/writing-rules.md``.

_Last reviewed: $($today)_
"@

New-Doc -Path (Join-Path $cp '04_CANONICAL_SOURCE_MAP.md') -Content @"
# Canonical source map

The single authoritative source for each class of fact. If it is not on this
list, it is not a source of truth.

| Fact | Source of truth | Format | Owner | Cadence |
|---|---|---|---|---|
| Hospital contacts, install base, opportunities | ``30_Hospital_Accounts/<hospital-id>/account_facts.json`` | JSON | Jordan | After each visit |
| Hospital aliases and IDs | ``30_Hospital_Accounts/_index.json`` | JSON | Jordan | On new account |
| Product codes and document register | ``00_AI_Control_Plane/10_PRODUCT_MASTER_INDEX.xlsx`` | XLSX | Jordan | Monthly |
| Clinical evidence and claim status | ``20_Product_Clinical_Knowledge/_clinical_evidence/claims_matrix.xlsx`` | XLSX | Jordan | Before any claim |
| Service jobs, WO numbers, PO status | ``70_Service_Tech_Ops/service_jobs_index.xlsx`` | XLSX | Jordan | Daily |
| Quote lines and CPQ inputs | ``50_Quotes_Proposals/quote_inputs/`` | JSON/XLSX | Jordan | Per quote |
| Territory priorities and pipeline | ``10_Territory_Intelligence/business_plan.xlsx`` | XLSX | Jordan | Weekly |
| Skills, triggers, source bindings | ``00_AI_Control_Plane/07_SKILL_REGISTRY.json`` | JSON | Jordan | Monthly |
| Decisions and reasoning | ``00_AI_Control_Plane/11_DECISION_LOG.md`` | MD | Jordan | Append-only |

_Last reviewed: $($today)_
"@

New-Doc -Path (Join-Path $cp '05_METADATA_STANDARD.md') -Content @"
# Metadata and naming standard

## File naming

``````
YYYY-MM-DD__entity-id__document-type__short-description__status__v01.ext
``````

Examples:

- ``2026-08-15__gold-coast-private__account-brief__current__v01.md``
- ``2026-08-15__1788__quick-guide-index__current__v01.xlsx``
- ``2026-08-15__st-vincents-northside__proposal__standardisation__sent__v03.pptx``

Entity IDs are kebab-case and must match ``30_Hospital_Accounts/_index.json``.

## Required fields in every index

``canonical_id``, ``title``, ``entity_type``, ``hospital_id``, ``product_family``,
``product``, ``document_type``, ``status``, ``source_of_truth``, ``owner``,
``audience``, ``sensitivity``, ``review_date``, ``effective_date``,
``expiry_date``, ``supersedes``, ``superseded_by``, ``onedrive_path``,
``related_notebooks``, ``tags``

## Allowed status values

``current``, ``draft``, ``in-review``, ``sent``, ``superseded``, ``archived``,
``expired``, ``unknown``

Only ``current`` files belong in a default notebook source pack.

_Last reviewed: $($today)_
"@

New-Doc -Path (Join-Path $cp '06_NOTEBOOK_CATALOG.md') -Content @"
# Copilot Notebook catalogue

A notebook is a scoped workroom, not a dumping ground. Each one gets a tight
source pack and a defined job. Microsoft grounds answers in the references you
add, up to roughly 300 files, so prefer specific files over whole folders.

| Notebook | Job | Source pack | Cadence |
|---|---|---|---|
| Product Knowledge | Codes, features, IFUs, quick guides | ``20_Product_Clinical_Knowledge/_notebook_source_pack/`` | Monthly |
| Clinical Applications | Procedure workflows and theatre relevance | ``20_Product_Clinical_Knowledge/_notebook_source_pack/clinical/`` | Monthly |
| Clinical Evidence & Claims | Evidence, claims, off-label rules | ``20_Product_Clinical_Knowledge/_clinical_evidence/`` | Before customer-facing claims |
| Competitive Intelligence | Competitor positioning | ``10_Territory_Intelligence/competitive/`` | Monthly |
| Hospital Accounts | Briefings and next best actions | ``30_Hospital_Accounts/`` | After each visit |
| Territory Planning | Pipeline, priorities, quarterly plan | ``10_Territory_Intelligence/`` | Weekly |
| Service Operations | Tech Services, ProCare, repairs, loans | ``70_Service_Tech_Ops/`` | Daily |
| Quoting & CPQ | Quote inputs and code validation | ``50_Quotes_Proposals/quote_inputs/`` | Per quote |
| Proposals | Customer-ready outputs | ``50_Quotes_Proposals/proposals/`` | Per proposal |
| Training & Cheat Sheets | In-service decks and theatre guides | ``60_Training_CheatSheets/`` | Per request |
| Leadership & Management | Internal updates and business reviews | ``10_Territory_Intelligence/leadership/`` | Monthly |
| Personal Development | Goals, reflection, learning | ``00_AI_Control_Plane/_source_originals/context/`` | Monthly |

## Building a source pack

Create ``_notebook_source_pack/`` inside the relevant folder and put only
``status: current`` files in it. Never point a notebook at ``90_Archive``.

_Last reviewed: $($today)_
"@

New-Doc -Path (Join-Path $cp '07_SKILL_REGISTRY.json') -Content @"
{
  "schemaVersion": 1,
  "lastReviewed": "$today",
  "_note": "One row per skill. Duplicates get merged or marked deprecated.",
  "skills": [
    {
      "name": "email-comms",
      "status": "current",
      "owner": "Jordan Pereira",
      "replaces": ["email-agent", "email-triage"],
      "whenToUse": ["reply to email", "draft message", "triage inbox", "teams message"],
      "doNotUseWhen": ["formal customer proposal"],
      "requiredSources": ["30_Hospital_Accounts/{hospital}/account_facts.json"],
      "outputs": ["email draft"],
      "path": "80_AI_Agents_Skills/email-comms/SKILL.md"
    },
    {
      "name": "service-ops",
      "status": "current",
      "owner": "Jordan Pereira",
      "replaces": ["tech-services-agent", "tech-services-ops"],
      "whenToUse": ["work order", "loan unit", "scope exchange", "ProCare"],
      "doNotUseWhen": ["customer-facing commercial proposal"],
      "requiredSources": [
        "70_Service_Tech_Ops/service_jobs_index.xlsx",
        "30_Hospital_Accounts/{hospital}/account_facts.json"
      ],
      "outputs": ["customer email draft", "Tech Services work order draft"],
      "path": "80_AI_Agents_Skills/service-ops/SKILL.md"
    },
    {
      "name": "training-content",
      "status": "current",
      "owner": "Jordan Pereira",
      "replaces": ["cheatsheet-builder", "stryker-cheatsheet-pptx"],
      "whenToUse": ["cheat sheet", "in-service", "laminated guide", "training deck"],
      "doNotUseWhen": ["clinical claim generation"],
      "requiredSources": ["20_Product_Clinical_Knowledge/"],
      "outputs": ["editable PPTX", "printable HTML card"],
      "path": "80_AI_Agents_Skills/training-content/SKILL.md"
    },
    {
      "name": "quote-copilot",
      "status": "current",
      "owner": "Jordan Pereira",
      "replaces": [],
      "whenToUse": ["CPQ entry", "quote validation", "product code check"],
      "doNotUseWhen": ["customer-facing narrative"],
      "requiredSources": ["00_AI_Control_Plane/10_PRODUCT_MASTER_INDEX.xlsx"],
      "outputs": ["CPQ checklist", "validated quote lines"],
      "path": "80_AI_Agents_Skills/quote-copilot/SKILL.md"
    },
    {
      "name": "proposal-builder",
      "status": "current",
      "owner": "Jordan Pereira",
      "replaces": [],
      "whenToUse": ["customer proposal", "standardisation pitch"],
      "doNotUseWhen": ["CPQ data entry"],
      "requiredSources": ["50_Quotes_Proposals/", "20_Product_Clinical_Knowledge/"],
      "outputs": ["proposal PPTX", "executive summary"],
      "path": "80_AI_Agents_Skills/proposal-builder/SKILL.md"
    },
    {
      "name": "hospital-context",
      "status": "current",
      "owner": "Jordan Pereira",
      "replaces": [],
      "whenToUse": ["account briefing", "visit debrief", "relationship map"],
      "doNotUseWhen": ["anything involving patient data"],
      "requiredSources": ["30_Hospital_Accounts/_index.json"],
      "outputs": ["account brief", "updated account_facts.json"],
      "path": "80_AI_Agents_Skills/hospital-context/SKILL.md"
    }
  ]
}
"@

New-Doc -Path (Join-Path $cp '11_DECISION_LOG.md') -Content @"
# Decision log

Append-only. Newest at the top. Never edit a past entry: supersede it.

## $today - Adopted the Jordan Knowledge System structure

**Decision:** Consolidate OneDrive under a single ``Jordan Knowledge System``
root with eleven numbered domains and a control plane.

**Reasoning:** Content was not the problem, fragmentation was. Duplicate skills,
mixed formats and scattered locations meant retrieval competed with itself.

**Context:** Migration executed with ``tools/onedrive-organiser`` from the
email-hub repo. Nothing deleted; superseded material moved to ``90_Archive``.

"@

New-Doc -Path (Join-Path $cp '12_ARCHIVE_POLICY.md') -Content @"
# Archive policy

## Principle

Archive, never delete. History is evidence. But archived material must not
compete with current material during retrieval.

## When something gets archived

- A newer version exists and is marked ``current``
- A proposal has been sent and the opportunity has closed
- A product document has been withdrawn or replaced
- A skill has been merged into another skill

## How

1. Set ``status: superseded`` in the relevant index.
2. Set ``superseded_by`` to the canonical ID of the replacement.
3. Move the file to ``90_Archive/<year>/``.
4. Remove it from every notebook source pack.

## What never gets archived, only corrected

The decision log, the canonical source map, and the metadata standard.

_Last reviewed: $($today)_
"@

New-Doc -Path (Join-Path $cp '13_CHANGELOG.md') -Content @"
# Changelog

## $today

- Created ``Jordan Knowledge System`` root and eleven top-level domains.
- Created the AI control plane: README, system index, operating guide, source
  map, metadata standard, notebook catalogue, skill registry, archive policy.
- Migrated existing files with the plan/execute/undo toolkit.

"@

New-Doc -Path (Join-Path (Join-Path $root '80_AI_Agents_Skills') '_shared/SKILL_TEMPLATE.md') -Content @"
---
name: skill-name-here
status: current
owner: Jordan Pereira
when_to_use:
  - trigger phrase
  - trigger phrase
do_not_use_when:
  - the case that belongs to a different skill
required_sources:
  - /70_Service_Tech_Ops/service_jobs_index.xlsx
  - /30_Hospital_Accounts/HOSPITAL_ID/account_facts.json
outputs:
  - what this skill produces
last_reviewed: $today
---

# Skill name

## Job

One paragraph: what this skill does and who it does it for.

## Rules

- Never invent product codes, pricing, quantities or clinical claims.
- If a required source is missing, say so and stop.

## Steps

1.
2.
3.

## Worked example

**Input:**

**Output:**
"@

New-Doc -Path (Join-Path (Join-Path $root '80_AI_Agents_Skills') '_run-locally/_README.md') -Content @"
# Run locally

Scripts, executables and local tooling live here.

**This folder is not a knowledge source.** AI assistants may read these files to
explain what they do, but must not treat their contents as facts about the
territory, products, accounts or services.

Keep documentation for these scripts alongside them as ``.md`` files.

_Last reviewed: $($today)_
"@

Write-Host ""
Write-Host "Control plane ready." -ForegroundColor Green
Write-Host "  created: $made"
Write-Host "  kept   : $kept (already existed; use -Force to overwrite)"
Write-Host ""
