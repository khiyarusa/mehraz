# MEHRAZ dev tooling (never shipped): Grade 10 Experimental scope + progress tracker.
# Reads content/inventory.json, content/grade10/sources.json, chapter-map.json and
# catalog.json; writes the scope manifest, the progress tracker and the resume doc.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Read-Json($rel) {
    $p = Join-Path $root $rel
    if (-not (Test-Path -LiteralPath $p)) { return $null }
    [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8) | ConvertFrom-Json
}
function Write-Utf8($rel, $text) {
    [IO.File]::WriteAllText((Join-Path $root $rel), $text, (New-Object Text.UTF8Encoding($false)))
}

$inv = Read-Json 'content/inventory.json'
$src = Read-Json 'content/grade10/sources.json'
$map = Read-Json 'content/grade10/chapter-map.json'
$catalog = Read-Json 'content/catalog.json'

$g10 = @($inv.books | Where-Object { $_.grade -eq 10 })
$state = @{}
if ($src) { foreach ($s in @($src.books)) { $state[[string]$s.code] = $s } }
$mapByCode = @{}
if ($map) { foreach ($m in @($map.books)) { $mapByCode[[string]$m.code] = $m } }

# ---- scope rules (owner-approved in the brief) ----------------------------
$priority1 = @('110216','110210','110214','110211','110217')
$priority2 = @('110201','110202','110206','110230','110231')
$notApplicable = @('110203','110207','110209','110212','110213','110219','110220','110221','110223')  # other-track editions (humanities / math-only)
$excludedLow = @('110204','110205','110215','110218','110222','110224','110225','110228')

function Scope-Of($b) {
    $code = [string]$b.code
    if ($priority1 -contains $code) { return 'included_priority_1' }
    if ($priority2 -contains $code) { return 'included_priority_2' }
    if ($notApplicable -contains $code) { return 'not_applicable' }
    if ($excludedLow -contains $code) { return 'excluded_low_priority' }
    return 'excluded_low_priority'
}
function Subject-Of($b) {
    $t = [string]$b.title
    if ($t -match 'زیست') { return 'biology' }
    if ($t -match 'شیمی') { return 'chemistry' }
    if ($t -match 'فیزیک') { return 'physics' }
    if ($t -match 'آزمایشگاه') { return 'lab' }
    if ($t -match 'ریاضی') { return 'mathematics' }
    if ($t -match 'فارسی') { return 'persian' }
    if ($t -match 'نگارش') { return 'writing' }
    if ($t -match 'عربی') { return 'arabic' }
    if ($t -match 'انگلیسی|کتاب کار') { return 'english' }
    return 'other'
}

$scopeBooks = foreach ($b in $g10) {
    $st = $state[[string]$b.code]
    [pscustomobject]@{
        code = [string]$b.code
        title = $b.title
        subject = Subject-Of $b
        scope = Scope-Of $b
        pageUrl = $b.bookPageUrl
        pdfUrl = $b.pdfUrl
        pages = if ($st) { $st.pages } else { $null }
        downloadStatus = if ($st) { $st.downloadStatus } else { 'not-started' }
        sha256 = if ($st) { $st.sha256 } else { $null }
        transport = 'unencrypted'
        chaptersDetected = if ($mapByCode[[string]$b.code]) { @($mapByCode[[string]$b.code].chapters).Count } else { 0 }
    }
}
$scopeDoc = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    grade = 10
    track = 'experimental'
    academicYear = '1405-1406'
    rule = 'Priority 1 = biology, chemistry, physics, mathematics, lab; Priority 2 = Persian, writing, Arabic, English + workbook; low-value memorisation subjects excluded by owner.'
    counts = [ordered]@{
        total = @($scopeBooks).Count
        includedPriority1 = @($scopeBooks | Where-Object { $_.scope -eq 'included_priority_1' }).Count
        includedPriority2 = @($scopeBooks | Where-Object { $_.scope -eq 'included_priority_2' }).Count
        notApplicable = @($scopeBooks | Where-Object { $_.scope -eq 'not_applicable' }).Count
        excludedLowPriority = @($scopeBooks | Where-Object { $_.scope -eq 'excluded_low_priority' }).Count
    }
    books = @($scopeBooks | Sort-Object scope, code)
}
Write-Utf8 'content/grade10-experimental-scope.json' ($scopeDoc | ConvertTo-Json -Depth 6)

# ---- progress tracker ------------------------------------------------------
$included = @($scopeBooks | Where-Object { $_.scope -like 'included*' })
$items = @()
foreach ($b in $included) {
    $st = $state[$b.code]
    $chapters = if ($mapByCode[$b.code]) { @($mapByCode[$b.code].chapters) } else { @() }
    $lessons = @()
    $book = @($catalog.books | Where-Object { $_.grade -eq 10 -and $_.title -eq $b.title })[0]
    if ($book) { foreach ($ch in @($book.chapters)) { foreach ($l in @($ch.lessons)) { $lessons += $l } } }
    $items += [pscustomobject]@{
        bookCode = $b.code
        title = $b.title
        subject = $b.subject
        scope = $b.scope
        source = [pscustomobject]@{ pages = $b.pages; download = $b.downloadStatus; sha256 = $b.sha256; transport = 'unencrypted' }
        chaptersDetected = @($chapters).Count
        lessonsWritten = @($lessons).Count
        lessonsReviewed = @($lessons | Where-Object { $_.verification -and $_.verification.status -eq 'reviewed' }).Count
        lessonsVerified = @($lessons | Where-Object { $_.verification -and $_.verification.status -eq 'verified' }).Count
        status = if (@($lessons).Count -eq 0) { 'source_downloaded' } elseif (@($lessons | Where-Object { $_.verification -and $_.verification.status -eq 'verified' }).Count -eq @($lessons).Count) { 'lessons_verified' } else { 'in_progress' }
        updatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    }
}
$progress = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    scope = 'grade-10 experimental (selected)'
    totals = [ordered]@{
        includedBooks = $included.Count
        booksWithLessons = @($items | Where-Object { $_.lessonsWritten -gt 0 }).Count
        chaptersDetected = ($items | Measure-Object chaptersDetected -Sum).Sum
        lessonsWritten = ($items | Measure-Object lessonsWritten -Sum).Sum
        lessonsReviewed = ($items | Measure-Object lessonsReviewed -Sum).Sum
        lessonsVerified = ($items | Measure-Object lessonsVerified -Sum).Sum
    }
    books = $items
}
Write-Utf8 'content/grade10-experimental-progress.json' ($progress | ConvertTo-Json -Depth 8)

# ---- docs ------------------------------------------------------------------
$scopeRows = (@($scopeBooks | Sort-Object scope, code) | ForEach-Object {
    "| $($_.code) | $($_.title) | $($_.subject) | $($_.scope) | $($_.pages) |"
}) -join "`n"
Write-Utf8 'docs/GRADE10-EXPERIMENTAL-SCOPE.md' @"
# Grade 10 Experimental Sciences — selected scope

Generated: $($scopeDoc.generatedAt)

| Code | Title | Subject | Scope | Pages |
|---|---|---|---|---:|
$scopeRows

- Included priority 1: **$($scopeDoc.counts.includedPriority1)**
- Included priority 2: **$($scopeDoc.counts.includedPriority2)**
- Not applicable (other tracks): **$($scopeDoc.counts.notApplicable)**
- Excluded by owner (low-value memorisation): **$($scopeDoc.counts.excludedLowPriority)**

The official inventory still records every grade-10 book; only included books
appear in the student library. Exclusion is a scope decision, not a missing source.
"@

$progRows = (@($items) | ForEach-Object {
    "| $($_.bookCode) | $($_.title) | $($_.chaptersDetected) | $($_.lessonsWritten) | $($_.lessonsReviewed) | $($_.status) |"
}) -join "`n"
Write-Utf8 'docs/GRADE10-EXPERIMENTAL-PRODUCTION-LOG.md' @"
# Grade 10 Experimental — production log

Generated: $($progress.generatedAt)

| Book | Title | Chapters detected | Lessons | Reviewed | Status |
|---|---|---:|---:|---:|---|
$progRows

## Totals

- Included books: **$($progress.totals.includedBooks)**
- Books with lessons: **$($progress.totals.booksWithLessons)**
- Chapters detected (OCR): **$($progress.totals.chaptersDetected)**
- Lessons written: **$($progress.totals.lessonsWritten)**
- Reviewed: **$($progress.totals.lessonsReviewed)**
- Verified: **$($progress.totals.lessonsVerified)**
"@

$next = @($items | Where-Object { $_.lessonsWritten -eq 0 } | Sort-Object scope, bookCode)[0]
$resume = @"
# Grade 10 Experimental — resume point

Generated: $($progress.generatedAt)

## Done

- 27/27 grade-10 PDFs downloaded and structurally verified.
- OCR of the first pages for every book; chapter candidates for 22 books.
- Biology chapter 1: three lessons (one reviewed).

## Next unfinished item

$(if ($next) { "- **$($next.bookCode) — $($next.title)** ($($next.subject), $($next.scope)): no lesson written yet." } else { '- All included books have at least one lesson.' })

## Rules for the next session

1. Never rewrite a verified lesson.
2. OCR the specific chapter pages before writing.
3. Visually check each cited page against the rendered image.
4. Keep lesson files in ``content/lessons`` and run ``tools/merge-lessons.ps1``.
5. Rebuild, test, update this file, commit.
"@
Write-Utf8 'docs/GRADE10-EXPERIMENTAL-RESUME.md' $resume

Write-Output ("scope: {0} total, {1} p1, {2} p2, {3} n/a, {4} excluded | included={5}" -f $scopeBooks.Count, $scopeDoc.counts.includedPriority1, $scopeDoc.counts.includedPriority2, $scopeDoc.counts.notApplicable, $scopeDoc.counts.excludedLowPriority, $included.Count)
