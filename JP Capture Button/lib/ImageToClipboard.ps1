# ImageToClipboard.ps1
# Loads an image file from disk and places it on the Windows clipboard as an
# actual image (so it can be pasted straight into emails, docs, chats, etc.).
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File ImageToClipboard.ps1 "C:\path\to\file.png"

param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "File not found: $Path"
    exit 1
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    # Load the bytes first so the file handle is released immediately,
    # then build the bitmap from a memory stream. This avoids locking the file.
    $bytes  = [System.IO.File]::ReadAllBytes($Path)
    $stream = New-Object System.IO.MemoryStream(, $bytes)
    $image  = [System.Drawing.Image]::FromStream($stream)
    [System.Windows.Forms.Clipboard]::SetImage($image)
    $image.Dispose()
    $stream.Dispose()
    exit 0
}
catch {
    Write-Error $_
    exit 1
}
