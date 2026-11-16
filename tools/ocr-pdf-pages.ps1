# MEHRAZ dev tooling (never shipped): render + OCR official textbook pages.
# Output: <OutDir>\page-XXXX.png and <OutDir>\page-XXXX.txt (UTF-8).
# Requires: Tesseract 5 with a Persian model (--tessdata-dir), and Windows PDF API.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Pdf,
    [Parameter(Mandatory = $true)][string]$OutDir,
    [int]$From = 0,
    [int]$To = -1,
    [int]$Width = 2400,
    [string]$Tesseract = 'C:\Program Files\Tesseract-OCR\tesseract.exe',
    [string]$Tessdata = '.tmp\tessdata',
    [string]$Lang = 'fas',
    [string]$Psm = '6',
    [switch]$SkipRender
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not $SkipRender) {
    & (Join-Path $root 'tools/render-pdf-pages.ps1') -Pdf $Pdf -OutDir $OutDir -From $From -To $To -Width $Width | Out-Null
}

$files = Get-ChildItem -LiteralPath $OutDir -Filter 'page-*.png' | Sort-Object Name
if ($From -ge 0) { $files = $files | Where-Object { [int]($_.BaseName -replace 'page-', '') -ge $From } }
if ($To -ge 0) { $files = $files | Where-Object { [int]($_.BaseName -replace 'page-', '') -le $To } }

$done = 0
foreach ($f in $files) {
    $base = [IO.Path]::Combine((Resolve-Path $OutDir).Path, $f.BaseName)
    $txt = "$base.txt"
    if ((Test-Path $txt) -and (Get-Item $txt).Length -gt 0) { continue }
    & $Tesseract $f.FullName $base -l $Lang --tessdata-dir $Tessdata --psm $Psm 2>$null | Out-Null
    $done++
    Write-Output ("  ocr {0}" -f $f.BaseName)
}
Write-Output ("ocr pages: {0}" -f $done)
