<#
.SYNOPSIS
    Scans a OneDrive folder and produces a reviewable move plan. Moves nothing.

.DESCRIPTION
    Walks every file under -SourceRoot, classifies it against rules.json, and writes:
      plan.csv     - one row per file: where it is, where it would go, why
      summary.md   - counts by destination and rule, plus everything it could not classify

    Nothing is moved, copied, renamed or deleted by this script. Review plan.csv,
    edit it if you disagree, then run Invoke-OneDrivePlan.ps1.

.PARAMETER SourceRoot
    The OneDrive folder to reorganise, e.g. "C:\Users\jpereira\OneDrive - Stryker"

.PARAMETER OutputDir
    Where to write plan.csv and summary.md. Defaults to .\out next to this script.

.PARAMETER ArchiveOlderThanDays
    If set, any file not modified in this many days is routed to 90_Archive
    instead of its normal destination. 0 (default) disables the date rule.

.EXAMPLE
    .\Build-OneDrivePlan.ps1 -SourceRoot "C:\Users\jpereira\OneDrive - Stryker"

.EXAMPLE
    .\Build-OneDrivePlan.ps1 -SourceRoot "C:\Users\jpereira\OneDrive - Stryker" -ArchiveOlderThanDays 730
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SourceRoot,

    [string]$RulesPath = (Join-Path $PSScriptRoot 'rules.json'),
    [string]$OutputDir = (Join-Path $PSScriptRoot 'out'),
    [string]$TargetRoot,
    [int]$ArchiveOlderThanDays = 0,
    [int]$MaxPathLength = 250
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

# ---------------------------------------------------------------- setup

if (-not (Test-Path -LiteralPath $SourceRoot)) {
    throw "SourceRoot not found: $SourceRoot"
}
if (-not (Test-Path -LiteralPath $RulesPath)) {
    throw "Rules file not found: $RulesPath"
}

$SourceRoot = (Resolve-Path -LiteralPath $SourceRoot).Path.TrimEnd('\', '/')
$sep        = [System.IO.Path]::DirectorySeparatorChar
$rules = Get-Content -LiteralPath $RulesPath -Raw -Encoding UTF8 | ConvertFrom-Json

if ($TargetRoot) { $rules.targetRoot = $TargetRoot }

if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host ""
Write-Host "OneDrive reorg - plan builder" -ForegroundColor Cyan
Write-Host "  Source : $SourceRoot"
Write-Host "  Target : $SourceRoot\$($rules.targetRoot)"
Write-Host "  Rules  : $RulesPath"
Write-Host ""
Write-Host "  This script does not move anything." -ForegroundColor Yellow
Write-Host ""

# ---------------------------------------------------------------- helpers

function ConvertTo-KebabCase {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return 'unresolved' }
    $slug = $Text.ToLowerInvariant()
    $slug = $slug -replace "[’']", ''
    $slug = $slug -replace '[^a-z0-9]+', '-'
    $slug = $slug.Trim('-')
    if ([string]::IsNullOrWhiteSpace($slug)) { return 'unresolved' }
    return $slug
}

function Test-AnyRegex {
    param([string]$Text, $Patterns)
    if ($null -eq $Patterns) { return $false }
    foreach ($p in $Patterns) {
        if ($Text -match $p) { return $true }
    }
    return $false
}

# Build a hospital alias lookup so hospital files land in a stable folder id.
# Sources, in order: hospitals.json beside this script, then any _index.json
# found under the source root that looks like a hospital index.
function Get-HospitalAliasMap {
    param([string]$Root)

    $map = @{}

    $override = Join-Path $PSScriptRoot 'hospitals.json'
    $candidates = @()
    if (Test-Path -LiteralPath $override) { $candidates += $override }

    $found = Get-ChildItem -LiteralPath $Root -Filter '_index.json' -Recurse -File -Force -ErrorAction SilentlyContinue |
                Select-Object -First 10
    foreach ($f in $found) { $candidates += $f.FullName }

    foreach ($path in $candidates) {
        try {
            $json = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
        } catch {
            Write-Verbose "Could not parse $path"
            continue
        }

        # Tolerate several shapes: { hospitals: [...] }, { aliases: {...} }, or a bare array.
        $entries = @()
        foreach ($prop in @('hospitals', 'accounts', 'entries', 'items')) {
            if ($json.PSObject.Properties.Name -contains $prop) { $entries = $json.$prop; break }
        }
        if (-not $entries -and $json -is [System.Array]) { $entries = $json }
        if (-not $entries) { continue }

        foreach ($e in $entries) {
            if ($e -isnot [psobject]) { continue }
            $names = $e.PSObject.Properties.Name

            $id = $null
            foreach ($k in @('id', 'hospital_id', 'hospitalId', 'slug', 'key')) {
                if ($names -contains $k -and $e.$k) { $id = [string]$e.$k; break }
            }
            if (-not $id) { continue }
            $id = ConvertTo-KebabCase $id

            $labels = New-Object System.Collections.ArrayList
            [void]$labels.Add($id)
            foreach ($k in @('name', 'display_name', 'displayName', 'title')) {
                if ($names -contains $k -and $e.$k) { [void]$labels.Add([string]$e.$k) }
            }
            foreach ($k in @('aliases', 'alias', 'also_known_as', 'synonyms')) {
                if ($names -contains $k -and $e.$k) {
                    foreach ($a in @($e.$k)) { [void]$labels.Add([string]$a) }
                }
            }

            foreach ($label in $labels) {
                $norm = ($label -replace '[^A-Za-z0-9]+', ' ').Trim().ToLowerInvariant()
                if ($norm.Length -ge 4 -and -not $map.ContainsKey($norm)) {
                    $map[$norm] = $id
                }
            }
        }
    }

    return $map
}

function Resolve-HospitalId {
    param([string]$RelPath, [hashtable]$AliasMap, $Rules)

    $haystack = ($RelPath -replace '[^A-Za-z0-9]+', ' ').Trim().ToLowerInvariant()

    # Longest alias first so "st vincents northside" beats "st vincents".
    foreach ($alias in ($AliasMap.Keys | Sort-Object { $_.Length } -Descending)) {
        if ($haystack -like "*$alias*") { return $AliasMap[$alias] }
    }

    # Fall back to the folder segment that looks most like a hospital name.
    $segments = $RelPath.Split('/')
    for ($i = $segments.Count - 2; $i -ge 0; $i--) {
        $seg = $segments[$i]
        foreach ($kw in $Rules.hospitalKeywords) {
            if ($seg -match [regex]::Escape($kw)) { return (ConvertTo-KebabCase $seg) }
        }
    }

    return 'unresolved'
}

function Expand-DestinationTokens {
    param([string]$Destination, [string]$HospitalId, [string]$ParentName, [datetime]$Modified)

    $out = $Destination
    $out = $out -replace '\{hospital\}', $HospitalId
    $out = $out -replace '\{parent\}',   (ConvertTo-KebabCase $ParentName)
    $out = $out -replace '\{year\}',     $Modified.ToString('yyyy')
    $out = $out -replace '\{month\}',    $Modified.ToString('MM')
    return $out
}

# ---------------------------------------------------------------- scan

Write-Host "Reading hospital aliases..." -ForegroundColor DarkGray
$aliasMap = Get-HospitalAliasMap -Root $SourceRoot
Write-Host "  $($aliasMap.Count) alias(es) loaded" -ForegroundColor DarkGray

Write-Host "Enumerating files (this can take a few minutes on a large drive)..." -ForegroundColor DarkGray
$allFiles = Get-ChildItem -LiteralPath $SourceRoot -Recurse -File -Force -ErrorAction SilentlyContinue
Write-Host "  $($allFiles.Count) file(s) found" -ForegroundColor DarkGray
Write-Host ""

$plan          = New-Object System.Collections.ArrayList
$proposedSeen  = @{}
$skipped       = 0
$processed     = 0
$archiveCutoff = if ($ArchiveOlderThanDays -gt 0) { (Get-Date).AddDays(-$ArchiveOlderThanDays) } else { $null }

foreach ($file in $allFiles) {
    $processed++
    if ($processed % 500 -eq 0) {
        $pct = [int](($processed / [Math]::Max($allFiles.Count, 1)) * 100)
        Write-Progress -Activity 'Classifying files' -Status "$processed / $($allFiles.Count)" -PercentComplete $pct
    }

    $relPath = $file.FullName.Substring($SourceRoot.Length).TrimStart('\', '/') -replace '\\', '/'
    $ext     = $file.Extension.ToLowerInvariant()

    if (Test-AnyRegex -Text $relPath -Patterns $rules.excludePaths)  { $skipped++; continue }
    if (Test-AnyRegex -Text $file.Name -Patterns $rules.excludeNames) { $skipped++; continue }

    $hospitalId = 'unresolved'
    $parentName = Split-Path (Split-Path $file.FullName -Parent) -Leaf

    # --- pick a destination ------------------------------------------------
    $destination = $null
    $ruleId      = $null
    $confidence  = $null
    $reason      = $null

    # Scripts and executables are "run" material, never "read" material.
    if ($rules.runLocallyExtensions -contains $ext) {
        $destination = '80_AI_Agents_Skills/_run-locally'
        $ruleId      = 'run-locally'
        $confidence  = 'high'
        $reason      = 'Executable or script: kept out of AI knowledge folders'
    }

    # Obvious duplicate/superseded naming goes straight to archive.
    if (-not $destination -and (Test-AnyRegex -Text $file.Name -Patterns $rules.archiveNamePatterns)) {
        $destination = "90_Archive/$($file.LastWriteTime.ToString('yyyy'))"
        $ruleId      = 'archive-by-name'
        $confidence  = 'medium'
        $reason      = 'Filename signals an old, duplicate or superseded version'
    }

    # Age-based archiving, only if the caller opted in.
    if (-not $destination -and $archiveCutoff -and $file.LastWriteTime -lt $archiveCutoff) {
        $destination = "90_Archive/$($file.LastWriteTime.ToString('yyyy'))"
        $ruleId      = 'archive-by-age'
        $confidence  = 'medium'
        $reason      = "Not modified since $($file.LastWriteTime.ToString('yyyy-MM-dd'))"
    }

    if (-not $destination) {
        foreach ($rule in $rules.rules) {
            $names = $rule.PSObject.Properties.Name

            if ($names -contains 'pathMatches' -and $rule.pathMatches) {
                if ($relPath -notmatch $rule.pathMatches) { continue }
            }
            if ($names -contains 'nameMatches' -and $rule.nameMatches) {
                if ($file.Name -notmatch $rule.nameMatches) { continue }
            }
            if ($names -contains 'extIn' -and $rule.extIn) {
                if ($rule.extIn -notcontains $ext) { continue }
            }

            $destination = $rule.destination
            $ruleId      = $rule.id
            $confidence  = $rule.confidence
            $reason      = $rule.why
            break
        }
    }

    if (-not $destination) {
        $destination = '99_Inbox_Processing/_unsorted'
        $ruleId      = 'no-match'
        $confidence  = 'low'
        $reason      = 'No rule matched: needs a human or a new rule'
    }

    if ($destination -eq '__SKIP__') { $skipped++; continue }

    if ($destination -match '\{hospital\}') {
        $hospitalId = Resolve-HospitalId -RelPath $relPath -AliasMap $aliasMap -Rules $rules
    }

    $destFolder = Expand-DestinationTokens -Destination $destination -HospitalId $hospitalId `
                                           -ParentName $parentName -Modified $file.LastWriteTime

    $proposedRel  = "$($rules.targetRoot)/$destFolder/$($file.Name)"
    $proposedFull = Join-Path $SourceRoot ($proposedRel -replace '/', $sep)

    # --- flags -------------------------------------------------------------
    $notes  = New-Object System.Collections.ArrayList
    $action = 'move'

    if ($proposedFull.Length -gt $MaxPathLength) {
        [void]$notes.Add("Path is $($proposedFull.Length) chars: shorten before moving")
        $action = 'review'
    }

    $key = $proposedFull.ToLowerInvariant()
    if ($proposedSeen.ContainsKey($key)) {
        [void]$notes.Add("Name collision with: $($proposedSeen[$key])")
        $action = 'review'
    } else {
        $proposedSeen[$key] = $relPath
    }

    if ($file.FullName -ieq $proposedFull) {
        $action = 'skip'
        [void]$notes.Add('Already in the right place')
    }

    if ($confidence -eq 'low' -and $action -eq 'move') { $action = 'review' }

    [void]$plan.Add([pscustomobject]@{
        Action       = $action
        Confidence   = $confidence
        RuleId       = $ruleId
        HospitalId   = $hospitalId
        SourcePath   = $file.FullName
        ProposedPath = $proposedFull
        Destination  = $destFolder
        FileName     = $file.Name
        Extension    = $ext
        SizeBytes    = $file.Length
        LastModified = $file.LastWriteTime.ToString('yyyy-MM-dd')
        Reason       = $reason
        Notes        = ($notes -join '; ')
    })
}

Write-Progress -Activity 'Classifying files' -Completed

# ---------------------------------------------------------------- output

$planPath = Join-Path $OutputDir 'plan.csv'
$plan | Export-Csv -LiteralPath $planPath -NoTypeInformation -Encoding UTF8

$byDest  = $plan | Group-Object Destination | Sort-Object Count -Descending
$byRule  = $plan | Group-Object RuleId      | Sort-Object Count -Descending
$byAct   = $plan | Group-Object Action      | Sort-Object Count -Descending
$unmatch = @($plan | Where-Object { $_.RuleId -eq 'no-match' })
$review  = @($plan | Where-Object { $_.Action -eq 'review' })
$toMove  = @($plan | Where-Object { $_.Action -eq 'move' })
$toSkip  = @($plan | Where-Object { $_.Action -eq 'skip' })

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('# OneDrive reorg - plan summary')
[void]$sb.AppendLine()
[void]$sb.AppendLine("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
[void]$sb.AppendLine("Source root: ``$SourceRoot``")
[void]$sb.AppendLine("Target root: ``$($rules.targetRoot)``")
[void]$sb.AppendLine()
[void]$sb.AppendLine("- Files scanned: **$($allFiles.Count)**")
[void]$sb.AppendLine("- Files planned: **$($plan.Count)**")
[void]$sb.AppendLine("- Files excluded: **$skipped**")
[void]$sb.AppendLine()
[void]$sb.AppendLine('## By action')
[void]$sb.AppendLine()
[void]$sb.AppendLine('| Action | Files |')
[void]$sb.AppendLine('|---|---:|')
foreach ($g in $byAct) { [void]$sb.AppendLine("| $($g.Name) | $($g.Count) |") }
[void]$sb.AppendLine()
[void]$sb.AppendLine('## By destination')
[void]$sb.AppendLine()
[void]$sb.AppendLine('| Destination | Files |')
[void]$sb.AppendLine('|---|---:|')
foreach ($g in $byDest) { [void]$sb.AppendLine("| $($g.Name) | $($g.Count) |") }
[void]$sb.AppendLine()
[void]$sb.AppendLine('## By rule')
[void]$sb.AppendLine()
[void]$sb.AppendLine('| Rule | Files |')
[void]$sb.AppendLine('|---|---:|')
foreach ($g in $byRule) { [void]$sb.AppendLine("| $($g.Name) | $($g.Count) |") }
[void]$sb.AppendLine()
[void]$sb.AppendLine("## Needs review ($($review.Count))")
[void]$sb.AppendLine()
[void]$sb.AppendLine('These will NOT move until you change Action to `move` in plan.csv.')
[void]$sb.AppendLine()
foreach ($r in ($review | Select-Object -First 100)) {
    [void]$sb.AppendLine("- ``$($r.SourcePath)`` -> $($r.Destination) _($($r.Notes))_")
}
[void]$sb.AppendLine()
[void]$sb.AppendLine("## Unclassified ($($unmatch.Count))")
[void]$sb.AppendLine()
[void]$sb.AppendLine('Send this list back to Claude to generate new rules for them.')
[void]$sb.AppendLine()
foreach ($r in ($unmatch | Select-Object -First 200)) {
    [void]$sb.AppendLine("- ``$($r.SourcePath)``")
}

$summaryPath = Join-Path $OutputDir 'summary.md'
Set-Content -LiteralPath $summaryPath -Value $sb.ToString() -Encoding UTF8

Write-Host ""
Write-Host "Plan written." -ForegroundColor Green
Write-Host "  $planPath"
Write-Host "  $summaryPath"
Write-Host ""
Write-Host "  move   : $($toMove.Count)" -ForegroundColor Green
Write-Host "  review : $($review.Count)" -ForegroundColor Yellow
Write-Host "  skip   : $($toSkip.Count)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Next: open plan.csv in Excel, sanity-check it, then run Invoke-OneDrivePlan.ps1" -ForegroundColor Cyan
Write-Host ""
