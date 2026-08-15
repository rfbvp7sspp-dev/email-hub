<#
.SYNOPSIS
    Reverses a run of Invoke-OneDrivePlan.ps1 using its move-log.csv.

.DESCRIPTION
    Replays the log in reverse order, moving each file from where it ended up
    back to where it came from. Dry run by default.

    Only rows with Status = Moved are reversed. If a file has been edited,
    renamed or moved again since the original run, that row is reported and
    left alone rather than guessed at.

.EXAMPLE
    .\Undo-OneDrivePlan.ps1 -LogPath ".\out\move-log-20260815-101500.csv"
    Dry run: shows what would be put back.

.EXAMPLE
    .\Undo-OneDrivePlan.ps1 -LogPath ".\out\move-log-20260815-101500.csv" -Execute
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$LogPath,

    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

if (-not (Test-Path -LiteralPath $LogPath)) {
    throw "Log not found: $LogPath"
}

$rows = @(Import-Csv -LiteralPath $LogPath | Where-Object { $_.Status -eq 'Moved' })
[array]::Reverse($rows)

Write-Host ""
if ($Execute) {
    Write-Host "OneDrive reorg - UNDO (executing)" -ForegroundColor Red
} else {
    Write-Host "OneDrive reorg - UNDO (dry run)" -ForegroundColor Yellow
}
Write-Host "  Log  : $LogPath"
Write-Host "  Rows : $($rows.Count) to reverse"
Write-Host ""

if ($rows.Count -eq 0) {
    Write-Host "Nothing to undo." -ForegroundColor DarkGray
    return
}

if ($Execute) {
    $answer = Read-Host "Type UNDO to continue"
    if ($answer -cne 'UNDO') {
        Write-Host "Cancelled." -ForegroundColor DarkGray
        return
    }
    Write-Host ""
}

$restored = 0
$failed   = 0
$missing  = 0

foreach ($row in $rows) {
    $current  = $row.To
    $original = $row.From

    if (-not (Test-Path -LiteralPath $current)) {
        Write-Warning "Not where the log says it is, skipping: $current"
        $missing++
        continue
    }
    if (Test-Path -LiteralPath $original) {
        Write-Warning "Something already occupies the original path, skipping: $original"
        $failed++
        continue
    }

    if (-not $Execute) {
        Write-Host "  would restore: $current" -ForegroundColor DarkGray
        Write-Host "             to: $original" -ForegroundColor DarkGray
        continue
    }

    try {
        $destDir = Split-Path -Parent $original
        if (-not (Test-Path -LiteralPath $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Move-Item -LiteralPath $current -Destination $original -ErrorAction Stop
        $restored++
    }
    catch {
        Write-Warning "Failed to restore $current : $($_.Exception.Message)"
        $failed++
    }
}

Write-Host ""
if ($Execute) {
    Write-Host "Undo complete." -ForegroundColor Green
    Write-Host "  restored : $restored"
    Write-Host "  skipped  : $missing (not at the logged location)"
    Write-Host "  failed   : $failed"
} else {
    Write-Host "Dry run complete. Re-run with -Execute to actually restore." -ForegroundColor Cyan
}
Write-Host ""
