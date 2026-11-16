# =============================================================================
#  MEHRAZ — PDF source inspector (development tooling)
#
#  Answers one question before any content work: does this textbook PDF carry a
#  real text layer, or is it a page-image scan? Scanned books require OCR, which
#  changes the whole production pipeline.
#
#  Usage:
#    powershell -File tools/inspect-pdf.ps1 -Path .tmp/books/C705.pdf
#    Get-ChildItem .tmp/books/*.pdf | % { .\tools\inspect-pdf.ps1 -Path $_.FullName }
# =============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Path
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Path)) { throw "Not found: $Path" }

$bytes = [IO.File]::ReadAllBytes($Path)
$latin1 = [Text.Encoding]::GetEncoding(28591)
$raw = $latin1.GetString($bytes)

$pages   = ([regex]::Matches($raw, '/Type\s*/Page[^s]')).Count
$fonts   = ([regex]::Matches($raw, '/FontFile2?3?')).Count
$baseFonts = ([regex]::Matches($raw, '/BaseFont\s*/([^\s/\]>]+)')) | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$toUni   = ([regex]::Matches($raw, '/ToUnicode')).Count
$images  = ([regex]::Matches($raw, '/Subtype\s*/Image')).Count
$dct     = ([regex]::Matches($raw, 'DCTDecode')).Count
$flate   = ([regex]::Matches($raw, 'FlateDecode')).Count

# A real text layer needs at least one font; a scan has images and no fonts.
$kind = if ($baseFonts.Count -gt 0 -and $toUni -gt 0) { 'text' }
        elseif ($baseFonts.Count -gt 0) { 'text-without-unicode-map' }
        elseif ($images -gt 0) { 'scan' }
        else { 'unknown' }

$result = [pscustomobject]@{
    file          = (Split-Path -Leaf $Path)
    bytes         = $bytes.Length
    sha256        = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    pagesApprox   = $pages
    fonts         = $baseFonts.Count
    fontNames     = ($baseFonts -join ',')
    toUnicodeMaps = $toUni
    images        = $images
    jpegImages    = $dct
    flateStreams  = $flate
    textLayer     = $kind
}

$result | Format-List
if ($kind -eq 'scan') {
    Write-Host 'This book is a page-image scan: text extraction requires OCR.' -ForegroundColor Yellow
}
return $result
