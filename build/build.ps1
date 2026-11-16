# =============================================================================
#  MEHRAZ — development build (Windows PowerShell, no external dependencies)
#  Combines src/ into the single distributable file: start.html
#  The end user never runs this script; start.html is already complete.
# =============================================================================
[CmdletBinding()]
param(
    [switch]$WithHarness
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

$styleFiles = @('tokens', 'layout', 'components', 'motion', 'responsive')
$scriptFiles = @(
    'bootstrap', 'art', 'jalali', 'storage', 'state', 'content', 'backup',
    'components', 'router', 'profile', 'dashboard', 'learning',
    'examination', 'review', 'settings', 'app'
)

function Read-Text([string]$relative) {
    $path = Join-Path $root $relative
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing source file: $relative"
    }
    return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function Write-Text([string]$relative, [string]$text) {
    $path = Join-Path $root $relative
    $dir = Split-Path -Parent $path
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    [System.IO.File]::WriteAllText($path, $text, $utf8)
}

Write-Host 'MEHRAZ build — assembling standalone start.html' -ForegroundColor Cyan

# ---- content catalogue -------------------------------------------------------
$catalogPath = Join-Path $root 'content/catalog.json'
$catalogJson = '{"schemaVersion":1,"books":[]}'
if (Test-Path -LiteralPath $catalogPath) {
    $catalogJson = [System.IO.File]::ReadAllText($catalogPath, [System.Text.Encoding]::UTF8).Trim()
}
# Guard: the embedded catalogue must parse, otherwise the app would reject it.
$null = $catalogJson | ConvertFrom-Json

# ---- styles -----------------------------------------------------------------
$cssParts = New-Object System.Collections.Generic.List[string]
foreach ($name in $styleFiles) {
    $body = Read-Text "src/styles/$name.css"
    $cssParts.Add("/* ==================== $name.css ==================== */`r`n$body")
}
$css = [string]::Join("`r`n", $cssParts)

# ---- scripts ----------------------------------------------------------------
$jsParts = New-Object System.Collections.Generic.List[string]
$jsParts.Add("/* Embedded content catalogue (phase 01: intentionally empty). */`r`nwindow.MEHRAZ_CONTENT = $catalogJson;")
foreach ($name in $scriptFiles) {
    $body = Read-Text "src/scripts/$name.js"
    $jsParts.Add("/* ==================== $name.js ==================== */`r`n$body")
}
$js = [string]::Join("`r`n", $jsParts)

# ---- template ---------------------------------------------------------------
$shell = Read-Text 'src/shell.html'
if ($shell.IndexOf('/*MEHRAZ:STYLES*/') -lt 0) { throw 'Style placeholder missing in src/shell.html' }
if ($shell.IndexOf('/*MEHRAZ:SCRIPTS*/') -lt 0) { throw 'Script placeholder missing in src/shell.html' }

$stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm')
$html = $shell.Replace('/*MEHRAZ:STYLES*/', $css).Replace('/*MEHRAZ:SCRIPTS*/', $js).Replace('{{BUILD_STAMP}}', $stamp)

if ($html.IndexOf('{{BUILD_STAMP}}') -ge 0) { throw 'Build stamp placeholder could not be replaced' }
# Resource-level external references are forbidden. Plain anchor links to the
# creator's contact pages are user-initiated navigation, not a runtime dependency,
# and are allowed (they are the only outbound links in the document).
if ($html -match '(?is)<(script|img|iframe|link|source|video|audio|object|embed|track)[^>]+(src|href)\s*=\s*["'']https?://') { throw 'External resource reference detected in build output' }
if ($html -match '(?i)url\(\s*["'']?https?://') { throw 'External CSS resource detected in build output' }
if ($html -match '(?i)@import') { throw 'CSS @import detected in build output' }
if ($html -match '(?i)fetch\s*\(|XMLHttpRequest|(?<![.\w])import\s*\(') { throw 'Network-capable API detected in build output' }

Write-Text 'start.html' $html

# ---- report -----------------------------------------------------------------
$startPath = Join-Path $root 'start.html'
$size = (Get-Item -LiteralPath $startPath).Length
$lines = (Get-Content -LiteralPath $startPath | Measure-Object -Line).Lines
$cssKb = [math]::Round(($css.Length / 1KB), 1)
$jsKb = [math]::Round(($js.Length / 1KB), 1)

$report = @"
MEHRAZ build report
===================
built at        : $stamp
output          : start.html
size            : $([math]::Round(($size / 1KB), 1)) KB
lines           : $lines
stylesheets     : $($styleFiles.Count) files, $cssKb KB
scripts         : $($scriptFiles.Count) files, $jsKb KB
content books   : $((ConvertFrom-Json $catalogJson).books.Count)
external refs   : none
network APIs    : none
"@
Write-Text 'build/build-report.txt' $report
Write-Host $report -ForegroundColor Green

# ---- optional responsive harness (development QA only, never distributed) ----
if ($WithHarness) {
    $escaped = $html.Replace('&', '&amp;').Replace('"', '&quot;').Replace('<', '&lt;').Replace('>', '&gt;')
    $tplPath = Join-Path $root 'build/harness-template.html'
    if (-not (Test-Path -LiteralPath $tplPath)) { throw 'build/harness-template.html is missing' }
    $tpl = [System.IO.File]::ReadAllText($tplPath, [System.Text.Encoding]::UTF8)
    $harness = $tpl.Replace('{{APP}}', $escaped)
    Write-Text 'build/qa-harness.html' $harness
    Write-Host 'QA harness written to build/qa-harness.html' -ForegroundColor Yellow
}

Write-Host 'Done.' -ForegroundColor Cyan
