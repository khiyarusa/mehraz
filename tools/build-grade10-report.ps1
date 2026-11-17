# MEHRAZ dev tooling (never shipped): grade-10 curriculum + source report.
# Reads content/inventory.json, content/grade10/sources.json and the OCR page
# texts; writes docs/GRADE-10-CURRICULUM.md and content/grade10/toc-index.json.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Read-Json($rel) {
    $p = Join-Path $root $rel
    if (-not (Test-Path -LiteralPath $p)) { return $null }
    [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8) | ConvertFrom-Json
}
$inv = Read-Json 'content/inventory.json'
$src = Read-Json 'content/grade10/sources.json'
$books = @($inv.books | Where-Object { $_.grade -eq 10 })
$state = @{}
if ($src) { foreach ($s in @($src.books)) { $state[[string]$s.code] = $s } }

function Track-Of($b) {
    if ($b.tracks -and @($b.tracks).Count -gt 1) { return 'shared' }
    if ($b.track) { return [string]$b.track }
    return 'general'
}

$rows = foreach ($b in $books) {
    $st = $state[[string]$b.code]
    [pscustomobject]@{
        code = [string]$b.code
        title = $b.title
        track = Track-Of $b
        tracks = (@($b.tracks) -join '+')
        url = $b.pdfUrl
        transport = $b.transportSecurity
        downloaded = if ($st) { $st.downloadStatus } else { 'not-started' }
        bytes = if ($st) { $st.bytes } else { $null }
        sha = if ($st -and $st.sha256) { $st.sha256.Substring(0, 12) + '…' } else { '' }
        pages = if ($st) { $st.pages } else { $null }
        ocr = if ($st) { "$($st.ocrPages)" } else { '0' }
    }
}

$byTrack = $rows | Group-Object track | Sort-Object Name
$trackLines = ($byTrack | ForEach-Object { "| $($_.Name) | $($_.Count) |" }) -join "`n"
$bookLines = ($rows | Sort-Object track, code | ForEach-Object {
    "| $($_.code) | $($_.title) | $($_.track) | $($_.pages) | $($_.ocr) | $($_.downloaded) |"
}) -join "`n"
$downloaded = @($rows | Where-Object { $_.downloaded -eq 'complete-and-structurally-valid' }).Count
$ocrBooks = @($rows | Where-Object { [int]$_.ocr -gt 0 }).Count
$totalPages = ($rows | Where-Object { $_.pages } | Measure-Object -Property pages -Sum).Sum

# ---- TOC extraction from OCR text ----------------------------------------
$toc = @()
$ocrRoot = Join-Path $root '.tmp/ocr/grade10'
foreach ($r in $rows | Sort-Object code) {
    $dir = Join-Path $ocrRoot $r.code
    if (-not (Test-Path -LiteralPath $dir)) { continue }
    $lines = @()
    foreach ($f in Get-ChildItem -LiteralPath $dir -Filter 'page-*.txt' | Sort-Object Name) {
        $text = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8)
        foreach ($ln in ($text -split "`r?`n")) {
            $t = $ln.Trim()
            if ($t.Length -lt 4 -or $t.Length -gt 90) { continue }
            if ($t -match 'فصل|گفتار|درس\s|بخش' -and $t -match '[0-9۰-۹]') {
                $lines += $t
            }
        }
    }
    $uniq = @($lines | Select-Object -Unique)
    if ($uniq.Count -gt 0) {
        $toc += [pscustomobject]@{ code = $r.code; title = $r.title; entries = $uniq }
    }
}
$tocDoc = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    method = 'OCR of the first pages; candidate lines only, not verified chapter titles'
    books = $toc
}
[IO.File]::WriteAllText((Join-Path $root 'content/grade10/toc-index.json'), ($tocDoc | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding($false)))

$doc = @"
# Grade 10 curriculum — inventory and source status

Generated: $($tocDoc.generatedAt)
Data: ``content/inventory.json`` + ``content/grade10/sources.json`` + OCR page texts.

## Track distribution

| Track / sharing | Books |
|---|---:|
$trackLines
| **Total** | **$($rows.Count)** |

## Books, files and OCR

| Code | Title | Track | Pages | OCR pages | Download |
|---|---|---|---:|---:|---|
$bookLines

- Books with a verified download: **$downloaded / $($rows.Count)**
- Books with OCR of the first pages: **$ocrBooks / $($rows.Count)**
- Total PDF pages across grade 10: **$totalPages**
- Transport for every record: **unencrypted** (owner-approved exception,
  ``docs/SOURCE-TRANSPORT-EXCEPTION.md``).

## What this table does not say

- Downloaded and page-counted is not the same as educationally verified.
- The OCR pages cover the table of contents only (first 8 pages), not the book.
- Candidate chapter titles are extracted to ``content/grade10/toc-index.json`` for
  review; they are not yet verified against the printed contents.

## Production state

- Lessons written for grade 10: see ``content/status.json`` (catalogue).
- No grade-10 book is complete.
"@
[IO.File]::WriteAllText((Join-Path $root 'docs/GRADE-10-CURRICULUM.md'), $doc, (New-Object Text.UTF8Encoding($false)))
Write-Output ("grade10 report: books={0} downloaded={1} ocr={2} pages={3} tocBooks={4}" -f $rows.Count, $downloaded, $ocrBooks, $totalPages, $toc.Count)
