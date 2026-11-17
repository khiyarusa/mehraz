# MEHRAZ dev tooling (never shipped): grade-10 source pipeline.
# For every grade-10 record in content/inventory.json:
#   1. download the official PDF with integrity checks (fetch-source-pdf.ps1)
#   2. record bytes / sha256 / page count (from the .download.json report)
#   3. render + OCR the first pages (TOC discovery) with the local Persian model
#   4. write a resumable checkpoint after every book
# Never uploads anything. Never bypasses TLS. HTTP is the owner-approved exception.
[CmdletBinding()]
param(
    [int]$MaxBooks = 0,
    [int]$OcrFrom = 0,
    [int]$OcrTo = 7,
    [switch]$SkipDownload,
    [switch]$SkipOcr
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$inventory = [IO.File]::ReadAllText((Join-Path $root 'content/inventory.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
$books = @($inventory.books | Where-Object { $_.grade -eq 10 -and $_.pdfUrl })
if ($MaxBooks -gt 0) { $books = @($books | Select-Object -First $MaxBooks) }

$bookDir = Join-Path $root '.tmp/books/grade10'
$ocrRoot = Join-Path $root '.tmp/ocr/grade10'
$stateDir = Join-Path $root 'content/grade10'
New-Item -ItemType Directory -Force -Path $bookDir, $ocrRoot, $stateDir | Out-Null
$statePath = Join-Path $stateDir 'sources.json'

$state = @{}
if (Test-Path -LiteralPath $statePath) {
    $prev = [IO.File]::ReadAllText($statePath, [Text.Encoding]::UTF8) | ConvertFrom-Json
    foreach ($p in @($prev.books)) { if ($p.code) { $state[[string]$p.code] = $p } }
}

$fetch = Join-Path $root 'tools/fetch-source-pdf.ps1'
$render = Join-Path $root 'tools/render-pdf-pages.ps1'
$ocr = Join-Path $root 'tools/ocr-pdf-pages.ps1'
$tessdata = Join-Path $root '.tmp/tessdata'
$tesseract = 'C:\Program Files\Tesseract-OCR\tesseract.exe'

function Get-PdfPages([string]$path) {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $g = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
    [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null
    try {
        $f = & { param($op) $t = $g.MakeGenericMethod([Windows.Storage.StorageFile]).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result } ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path -LiteralPath $path).Path))
        $d = & { param($op) $t = $g.MakeGenericMethod([Windows.Data.Pdf.PdfDocument]).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result } ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($f))
        return [int]$d.PageCount
    } catch { return $null }
}

$i = 0
foreach ($b in $books) {
    $i++
    $code = [string]$b.code
    $pdf = Join-Path $bookDir ("C$code.pdf")
    Write-Output ("[{0}/{1}] {2} {3}" -f $i, $books.Count, $code, $b.title)

    $record = $state[$code]
    if (-not $record) {
        $record = [pscustomobject]@{
            code = $code; title = $b.title; track = $b.track; tracks = @($b.tracks)
            pageUrl = $b.bookPageUrl; pdfUrl = $b.pdfUrl; transport = 'unencrypted'
            bytes = $null; sha256 = $null; pages = $null; downloadStatus = 'pending'
            ocrPages = 0; ocrStatus = 'pending'; updatedAt = $null; error = $null
        }
    }

    try {
        if (-not $SkipDownload) {
            if (Test-Path -LiteralPath $pdf) {
                $reportPath = "$pdf.download.json"
                $complete = $false
                if (Test-Path -LiteralPath $reportPath) {
                    $rep = [IO.File]::ReadAllText($reportPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
                    if ($rep.status -eq 'complete-and-structurally-valid') {
                        $record.bytes = $rep.bytes; $record.sha256 = $rep.sha256; $record.pages = $rep.pages
                        $record.downloadStatus = $rep.status
                        $complete = $true
                    }
                }
                if (-not $complete) {
                    # partial or unverified file: resume from its current length
                    & $fetch -Url $b.pdfUrl -OutFile $pdf | Out-Null
                    $rep = [IO.File]::ReadAllText("$pdf.download.json", [Text.Encoding]::UTF8) | ConvertFrom-Json
                    $record.bytes = $rep.bytes; $record.sha256 = $rep.sha256; $record.pages = $rep.pages
                    $record.downloadStatus = $rep.status
                }
            } else {
                & $fetch -Url $b.pdfUrl -OutFile $pdf | Out-Null
                $rep = [IO.File]::ReadAllText("$pdf.download.json", [Text.Encoding]::UTF8) | ConvertFrom-Json
                $record.bytes = $rep.bytes; $record.sha256 = $rep.sha256; $record.pages = $rep.pages
                $record.downloadStatus = $rep.status
            }
        }

        if (-not $SkipOcr -and (Test-Path -LiteralPath $pdf) -and $record.pages) {
            $dir = Join-Path $ocrRoot $code
            $to = [Math]::Min($OcrTo, [int]$record.pages - 1)
            $expected = $to - $OcrFrom + 1
            $existing = 0
            if (Test-Path -LiteralPath $dir) {
                $existing = @(Get-ChildItem -LiteralPath $dir -Filter 'page-*.txt' | Where-Object { $_.Length -gt 0 }).Count
            }
            if ($existing -lt $expected) {
                & $render -Pdf $pdf -OutDir $dir -From $OcrFrom -To $to | Out-Null
                & $ocr -Pdf $pdf -OutDir $dir -From $OcrFrom -To $to -SkipRender -Tessdata $tessdata -Tesseract $tesseract | Out-Null
            }
            $record.ocrPages = @(Get-ChildItem -LiteralPath $dir -Filter 'page-*.txt' | Where-Object { $_.Length -gt 0 }).Count
            $record.ocrStatus = if ($record.ocrPages -gt 0) { 'done' } else { 'failed' }
        }
        $record.error = $null
    } catch {
        $record.error = $_.Exception.Message
        Write-Output ("  ERROR: " + $record.error)
    }

    $record.updatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    $state[$code] = $record

    $list = $state.Values | Sort-Object code
    $doc = [ordered]@{
        schemaVersion = 1
        generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        grade = 10
        total = $books.Count
        books = $list
    }
    [IO.File]::WriteAllText($statePath, ($doc | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
}

$done = @($state.Values | Where-Object { $_.downloadStatus -eq 'complete-and-structurally-valid' }).Count
$ocrDone = @($state.Values | Where-Object { $_.ocrStatus -eq 'done' }).Count
Write-Output ("grade10 pipeline: {0} available, {1} downloaded+verified, {2} with OCR" -f $books.Count, $done, $ocrDone)
