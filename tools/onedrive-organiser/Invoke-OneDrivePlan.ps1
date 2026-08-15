<#
.SYNOPSIS
    Executes the move plan produced by Build-OneDrivePlan.ps1.

.DESCRIPTION
    Reads plan.csv and moves each file whose Action is "move".
    Rows marked "review" or "skip" are ignored.

    SAFETY MODEL
      - Dry run by default. Nothing moves unless you pass -Execute.
      - Never deletes. Never overwrites. A destination collision gets a
        " (2)" suffix and is recorded in the log.
      - Every successful move is written to move-log.csv, which
        Undo-OneDrivePlan.ps1 can replay in reverse.
      - Empty source folders are left in place; clean them up yourself once
        you are happy with the result.

.PARAMETER PlanPath
    Path to plan.csv. Defaults to .\out\plan.csv next to this script.

.PARAMETER Execute
    Actually move the files. Without this switch the script only reports.

.PARAMETER Limit
    Only process the first N rows. Useful for a small confidence run first.

.EXAMPLE
    .\Invoke-OneDrivePlan.ps1
    Dry run: shows what would happen.

.EXAMPLE
    .\Invoke-OneDrivePlan.ps1 -Limit 25 -Execute
    Move 25 files as a test.

.EXAMPLE
    .\Invoke-OneDrivePlan.ps1 -Execute
    Move everything the plan says to move.
#>
[CmdletBinding()]
param(
    [string]$PlanPath = (Join-Path $PSScriptRoot 'out\plan.csv'),
    [string]$LogDir   = (Join-Path $PSScriptRoot 'out'),
    [switch]$Execute,
    [int]$Limit = 0
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

if (-not (Test-Path -LiteralPath $PlanPath)) {
    throw "Plan not found: $PlanPath. Run Build-OneDrivePlan.ps1 first."
}
if (-not (Test-Path -LiteralPath $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$rows = @(Import-Csv -LiteralPath $PlanPath | Where-Object { $_.Action -eq 'move' })
if ($Limit -gt 0) { $rows = @($rows | Select-Object -First $Limit) }

Write-Host ""
if ($Execute) {
    Write-Host "OneDrive reorg - EXECUTING" -ForegroundColor Red
} else {
    Write-Host "OneDrive reorg - DRY RUN (nothing will move)" -ForegroundColor Yellow
}
Write-Host "  Plan  : $PlanPath"
Write-Host "  Rows  : $($rows.Count) marked 'move'"
Write-Host ""

if ($rows.Count -eq 0) {
    Write-Host "Nothing to do." -ForegroundColor DarkGray
    return
}

if ($Execute) {
    Write-Host "About to move $($rows.Count) file(s)." -ForegroundColor Yellow
    Write-Host "Tip: pause OneDrive sync first, and expect a long sync afterwards." -ForegroundColor DarkGray
    $answer = Read-Host "Type MOVE to continue"
    if ($answer -cne 'MOVE') {
        Write-Host "Cancelled." -ForegroundColor DarkGray
        return
    }
    Write-Host ""
}

$stamp   = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $LogDir "move-log-$stamp.csv"
$log     = New-Object System.Collections.ArrayList

$moved   = 0
$failed  = 0
$renamed = 0
$i       = 0

foreach ($row in $rows) {
    $i++
    if ($i % 25 -eq 0) {
        $pct = [int](($i / [Math]::Max($rows.Count, 1)) * 100)
        Write-Progress -Activity 'Moving files' -Status "$i / $($rows.Count)" -PercentComplete $pct
    }

    $from = $row.SourcePath
    $to   = $row.ProposedPath

    if (-not (Test-Path -LiteralPath $from)) {
        [void]$log.Add([pscustomobject]@{
            Timestamp = (Get-Date -Format 's'); From = $from; To = $to
            Status = 'MissingSource'; Error = 'Source no longer exists'
        })
        $failed++
        continue
    }

    $destDir = Split-Path -Parent $to

    # Resolve collisions by suffixing, never by overwriting.
    $finalTo = $to
    if (Test-Path -LiteralPath $finalTo) {
        $base = [System.IO.Path]::GetFileNameWithoutExtension($to)
        $ext  = [System.IO.Path]::GetExtension($to)
        $n    = 2
        while (Test-Path -LiteralPath $finalTo) {
            $finalTo = Join-Path $destDir ("{0} ({1}){2}" -f $base, $n, $ext)
            $n++
            if ($n -gt 500) { break }
        }
        $renamed++
    }

    if (-not $Execute) {
        Write-Host "  would move: $from" -ForegroundColor DarkGray
        Write-Host "          to: $finalTo" -ForegroundColor DarkGray
        continue
    }

    try {
        if (-not (Test-Path -LiteralPath $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Move-Item -LiteralPath $from -Destination $finalTo -ErrorAction Stop

        [void]$log.Add([pscustomobject]@{
            Timestamp = (Get-Date -Format 's'); From = $from; To = $finalTo
            Status = 'Moved'; Error = ''
        })
        $moved++
    }
    catch {
        [void]$log.Add([pscustomobject]@{
            Timestamp = (Get-Date -Format 's'); From = $from; To = $finalTo
            Status = 'Failed'; Error = $_.Exception.Message
        })
        $failed++
        Write-Warning "Failed: $from -> $($_.Exception.Message)"
    }
}

Write-Progress -Activity 'Moving files' -Completed

if ($Execute) {
    $log | Export-Csv -LiteralPath $logPath -NoTypeInformation -Encoding UTF8
    Write-Host ""
    Write-Host "Done." -ForegroundColor Green
    Write-Host "  moved     : $moved"
    Write-Host "  renamed   : $renamed (collision suffix applied)"
    Write-Host "  failed    : $failed"
    Write-Host "  undo log  : $logPath"
    Write-Host ""
    Write-Host "To reverse this run:" -ForegroundColor Cyan
    Write-Host "  .\Undo-OneDrivePlan.ps1 -LogPath `"$logPath`" -Execute"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Dry run complete. $($rows.Count) file(s) would move." -ForegroundColor Yellow
    Write-Host "Re-run with -Execute when you are happy." -ForegroundColor Cyan
    Write-Host ""
}
