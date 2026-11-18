# MEHRAZ dev tooling (never shipped): chunked OCR of one official book.
# Renders and OCRs a page range in chunks, deleting the PNGs after each chunk to
# keep disk usage bounded, and appends a progress line per chunk.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Code,
    [Parameter(Mandatory = $true)][int]$From,
    [Parameter(Mandatory = $true)][int]$To,
    [int]$Chunk = 10,
    [string]$Tessdata = '.tmp/tessdata'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pdf = Join-Path $root (".tmp/books/grade10/C$Code.pdf")
if (-not (Test-Path -LiteralPath $pdf)) { throw "missing PDF for $Code" }
$dir = Join-Path $root (".tmp/ocr/grade10/$Code")
$render = Join-Path $root 'tools/render-pdf-pages.ps1'
$ocr = Join-Path $root 'tools/ocr-pdf-pages.ps1'
$tesseract = 'C:\Program Files\Tesseract-OCR\tesseract.exe'

for ($i = $From; $i -le $To; $i += $Chunk) {
    $end = [Math]::Min($i + $Chunk - 1, $To)
    & $render -Pdf $pdf -OutDir $dir -From $i -To $end | Out-Null
    & $ocr -Pdf $pdf -OutDir $dir -From $i -To $end -SkipRender -Tessdata $Tessdata -Tesseract $tesseract | Out-Null
    Get-ChildItem -LiteralPath $dir -Filter 'page-*.png' -ErrorAction SilentlyContinue |
        Where-Object {
            $n = [int]($_.BaseName -replace 'page-', '')
            $n -ge $i -and $n -le $end
        } | Remove-Item -Force
    $done = @(Get-ChildItem -LiteralPath $dir -Filter 'page-*.txt' | Where-Object { $_.Length -gt 0 }).Count
    Write-Output ("ocr {0}: pages {1}-{2} done, total txt={3}" -f $Code, $i, $end, $done)
}
Write-Output ("OCR_COMPLETE {0} {1}-{2}" -f $Code, $From, $To)
