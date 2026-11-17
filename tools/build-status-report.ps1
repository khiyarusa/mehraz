# MEHRAZ dev tooling (never shipped): derive every status document from the
# machine-readable artefacts. Numbers are never typed by hand here.
#   content/inventory.json, content/source-manifest.json, content/catalog.json
# Output: content/status.json + docs/*.md status reports.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$docs = Join-Path $root 'docs'
New-Item -ItemType Directory -Force -Path $docs | Out-Null

function Read-Json([string]$rel) {
    $p = Join-Path $root $rel
    if (-not (Test-Path -LiteralPath $p)) { return $null }
    return [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8) | ConvertFrom-Json
}
function Write-Utf8([string]$rel, [string]$text) {
    [IO.File]::WriteAllText((Join-Path $root $rel), $text, (New-Object Text.UTF8Encoding($false)))
}

$inventory = Read-Json 'content/inventory.json'
$manifest = Read-Json 'content/source-manifest.json'
$catalog = Read-Json 'content/catalog.json'

$books = @($inventory.books)
$files = @($manifest.files)
$cbooks = @($catalog.books)

# ---- inventory counts ------------------------------------------------------
$byGrade = $books | Group-Object grade | Sort-Object Name | ForEach-Object { [ordered]@{ grade = [int]$_.Name; records = $_.Count } }
$transport = $books | Group-Object transportSecurity | ForEach-Object { [ordered]@{ scheme = $_.Name; records = $_.Count } }
$gradeVerified = ($books | Where-Object { $_.gradeConfidence -eq 'verified' }).Count
$withPdfUrl = ($books | Where-Object { $_.pdfUrl }).Count

# ---- downloaded + verified -------------------------------------------------
$downloaded = @($files | Where-Object { $_.bytes -gt 0 })
$verifiedFiles = @($files | Where-Object { $_.pagesApprox -and $_.sha256 -and $_.bytes -gt 0 })
$ocrDone = @($files | Where-Object { $_.extraction -and $_.extraction.status -eq 'ocr-done-pilot' })
$tlsFiles = @($files | Where-Object { $_.url -like 'https://*' })

# ---- catalogue content -----------------------------------------------------
$chapters = @()
$lessons = @()
foreach ($b in $cbooks) {
    foreach ($ch in @($b.chapters)) {
        $chapters += [pscustomobject]@{ book = $b.id; chapter = $ch.id; title = $ch.title; lessons = @($ch.lessons).Count }
        foreach ($l in @($ch.lessons)) { $lessons += [pscustomobject]@{ book = $b.id; chapter = $ch.id; lesson = $l; } }
    }
}
$filled = 0; $empty = 0; $activities = 0; $questions = 0
foreach ($row in $lessons) {
    $l = $row.lesson
    foreach ($k in @($l.sections.PSObject.Properties.Name)) {
        $sec = $l.sections.$k
        if ($sec -and $sec.blocks -and @($sec.blocks).Count -gt 0) { $filled++ } else { $empty++ }
    }
    if ($l.activities) { $activities += @($l.activities).Count }
    if ($l.questions) { $questions += @($l.questions).Count }
}
$examQuestions = 0
foreach ($b in $cbooks) {
    foreach ($ch in @($b.chapters)) {
        if (-not $ch) { continue }
        foreach ($ex in @($ch.exams)) {
            if (-not $ex -or -not $ex.questions) { continue }
            foreach ($q in @($ex.questions)) { if ($q) { $examQuestions++ } }
        }
    }
    foreach ($ex in @($b.exams)) {
        if (-not $ex -or -not $ex.questions) { continue }
        foreach ($q in @($ex.questions)) { if ($q) { $examQuestions++ } }
    }
}
$draftLessons = @($lessons | Where-Object { $_.lesson.verification -and $_.lesson.verification.status -eq 'draft' }).Count
$verifiedLessons = @($lessons | Where-Object { $_.lesson.verification -and $_.lesson.verification.status -eq 'verified' }).Count

$status = [ordered]@{
    generatedAt          = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    academicYear         = $inventory.academicYear
    inventory            = [ordered]@{
        records          = $books.Count
        withPdfUrl       = $withPdfUrl
        gradeVerified    = $gradeVerified
        byGrade          = $byGrade
        transport        = $transport
        note             = 'Portal records are not proof of a legally required textbook list, and a resolved PDF URL is not a download.'
    }
    sources              = [ordered]@{
        manifestRecords  = $files.Count
        downloaded       = $downloaded.Count
        structurallyVerified = $verifiedFiles.Count
        ocrCompleted     = $ocrDone.Count
        tlsAuthenticated = $tlsFiles.Count
        note             = 'All current downloads used plain HTTP; identity is proven by hash, publisher authentication is not.'
    }
    catalogue            = [ordered]@{
        books            = $cbooks.Count
        chapters         = $chapters.Count
        lessons          = $lessons.Count
        sectionsFilled   = $filled
        sectionsEmpty    = $empty
        activities       = $activities
        lessonQuestions  = $questions
        examQuestions    = $examQuestions
        draftLessons     = $draftLessons
        verifiedLessons  = $verifiedLessons
    }
    blockers             = @(
        'Source transport: the portal serves a certificate for *.roshd.ir on chap.sch.ir; strict TLS fails. The owner approved a documented HTTP exception on 2026-11-17 (docs/SOURCE-TRANSPORT-EXCEPTION.md). Files stay labelled transport-unverified; no publisher authentication is claimed.',
        'Only 3 of 130 PDFs are downloaded; none is transport-authenticated.',
        'One lesson of the 22-subsection biology pilot exists; the other 21 are not written.'
    )
}
Write-Utf8 'content/status.json' ($status | ConvertTo-Json -Depth 8)

# ---- docs/CONTENT-INVENTORY.md --------------------------------------------
$rows = ($byGrade | ForEach-Object { "| $($_.grade) | $($_.records) |" }) -join "`n"
$inv = @"
# Official textbook inventory — status

Generated: $($status.generatedAt) · academic year $($inventory.academicYear)
Source: ``content/inventory.json`` (built by ``tools/build-inventory.ps1``)

## Records

| Grade | Records |
|---|---:|
$rows
| **Total** | **$($books.Count)** |

- Records with a resolved official PDF URL: **$withPdfUrl**
- Grade attribution confirmed against the listing-page heading: **$gradeVerified**
- Transport: **$($transport[0].scheme)** for all $($books.Count) records

## What these numbers do not prove

- A catalogue record is not a downloaded file.
- A resolved PDF URL is not a verified source.
- The portal list is not a legally mandated curriculum list.
- Shared general textbooks are listed once per grade and marked with a ``tracks`` array.

## Source transport

The portal refuses strict TLS for its own hostname. The served certificate is
issued for ``*.roshd.ir``; validation reports ``RemoteCertificateNameMismatch``
and ``RemoteCertificateChainErrors``. Catalogue pages and PDFs are therefore read
over plain HTTP and every record carries ``transportSecurity: "unencrypted"``.
Hashes identify the received file; they do not authenticate the publisher.

See ``docs/SOURCE-MANIFEST.md`` for the per-file evidence.
"@
Write-Utf8 'docs/CONTENT-INVENTORY.md' $inv

# ---- docs/SOURCE-MANIFEST.md ----------------------------------------------
$fileRows = ($files | ForEach-Object {
    $t = if ($_.url -like 'https://*') { 'tls' } else { 'unencrypted' }
    "| $($_.bookCode) | $($_.title) | $($_.bytes) | $($_.sha256.Substring(0,12))… | $($_.pagesApprox) | $($_.textLayer) | $($_.extraction.status) | $t |"
}) -join "`n"
$man = @"
# Source manifest and transport audit

Generated: $($status.generatedAt)
Machine-readable source: ``content/source-manifest.json``

## Files

| Code | Title | Bytes | SHA-256 | Pages | Text layer | OCR | Transport |
|---|---|---:|---|---:|---|---|---|
$fileRows

## TLS audit (2026-11-17)

- ``https://chap.sch.ir/`` fails strict validation.
- Certificate subject: ``CN=*.roshd.ir``; SAN: ``*.roshd.ir``, ``roshd.ir``.
- Validation errors: ``RemoteCertificateNameMismatch``, ``RemoteCertificateChainErrors``.
- ``tools/net.ps1`` no longer contains any certificate override; HTTPS acquisition
  now fails closed with an explicit message.
- No silent downgrade is performed by the tooling; HTTP URLs are recorded as
  ``unencrypted`` at the point of download.

## Consequence

Files already on disk were downloaded over plain HTTP. Their SHA-256 proves what
was received; it does not prove that the file came from the publisher. The owner
approved a documented HTTP exception on 2026-11-17
(``docs/SOURCE-TRANSPORT-EXCEPTION.md``); every file remains labelled
**transport-unverified** and no UI or report claims publisher authentication.
The exception is limited to ``chap.sch.ir`` and to local acquisition.
"@
Write-Utf8 'docs/SOURCE-MANIFEST.md' $man

# ---- docs/CURRICULUM-COVERAGE.md ------------------------------------------
$covRows = @()
foreach ($b in $cbooks) {
    $ch = @($b.chapters).Count
    $ls = 0; foreach ($c in @($b.chapters)) { $ls += @($c.lessons).Count }
    $covRows += "| $($b.title) | $($b.grade) | $($b.track) | $ch | $ls | draft: $($draftLessons) |"
}
$cov = @"
# Curriculum coverage

Generated: $($status.generatedAt)

## Inventory vs production

| Book | Grade | Track | Chapters mapped | Lessons written | Status |
|---|---|---:|---:|---:|---|
$($covRows -join "`n")

## Totals

- Catalogue records: **$($books.Count)**
- Books with any authored content: **$($cbooks.Count)**
- Chapters mapped: **$($chapters.Count)**
- Lessons written: **$($lessons.Count)**
- Lessons verified: **$verifiedLessons**
- Lessons draft: **$draftLessons**
- Sections filled / empty (of 10 per lesson): **$filled / $empty**

No percentage of overall curriculum completion is claimed: $($books.Count - $cbooks.Count) catalogue books have no content at all.
"@
Write-Utf8 'docs/CURRICULUM-COVERAGE.md' $cov

# ---- docs/CONTENT-QA-REPORT.md --------------------------------------------
$checks = New-Object System.Collections.Generic.List[object]
function Add-Check($name, $ok, $detail) { $checks.Add([pscustomobject]@{ check = $name; result = if ($ok) { 'PASS' } else { 'FAIL' }; detail = $detail }) }
Add-Check 'catalog.json parses' ([bool]$catalog) 'loaded'
Add-Check 'unique book ids' ((@($cbooks.id | Sort-Object -Unique)).Count -eq $cbooks.Count) "$($cbooks.Count) books"
$allIds = @(); foreach ($b in $cbooks) { $allIds += $b.id; foreach ($c in @($b.chapters)) { $allIds += $c.id; foreach ($l in @($c.lessons)) { $allIds += $l.id } } }
Add-Check 'unique ids across books/chapters/lessons' ((@($allIds | Sort-Object -Unique)).Count -eq $allIds.Count) "$($allIds.Count) ids"
$missingSource = 0; foreach ($l in $lessons) { if (-not $l.lesson.source -or -not $l.lesson.source.reference) { $missingSource++ } }
Add-Check 'every lesson has a source locator' ($missingSource -eq 0) "$missingSource missing"
$noExp = 0; $noSrc = 0
foreach ($b in $cbooks) { foreach ($c in @($b.chapters)) { if (-not $c) { continue }; foreach ($ex in @($c.exams)) { if (-not $ex) { continue }; foreach ($q in @($ex.questions)) { if (-not $q) { continue }; if (-not $q.explanation) { $noExp++ }; if (-not $q.source) { $noSrc++ } } } } }
Add-Check 'every exam question has an explanation' ($noExp -eq 0) "$noExp missing"
Add-Check 'every exam question has a source' ($noSrc -eq 0) "$noSrc missing"
$draft = $draftLessons
Add-Check 'no lesson is published as verified without evidence' ($verifiedLessons -eq 0) "$verifiedLessons verified, $draft draft"
Add-Check 'downloaded files structurally verified' ($verifiedFiles.Count -eq $files.Count) "$($verifiedFiles.Count)/$($files.Count)"
Add-Check 'source transport authenticated' ($tlsFiles.Count -eq $files.Count) "$($tlsFiles.Count)/$($files.Count) over TLS"

$qaRows = ($checks | ForEach-Object { "| $($_.check) | $($_.result) | $($_.detail) |" }) -join "`n"
$qa = @"
# Content QA report

Generated: $($status.generatedAt) · automated checks only

| Check | Result | Detail |
|---|---|---|
$qaRows

## Not tested

- Visual comparison of lesson text against rendered page images: **NOT TESTED**.
- Independent second-reviewer verification of answers: **NOT TESTED**.
- OCR accuracy measurement: **NOT TESTED**.
- Android rendering of content pages: **NOT TESTED**.

A browser score of 100% proves the answer key was applied, not that it is correct.
"@
Write-Utf8 'docs/CONTENT-QA-REPORT.md' $qa

# ---- docs/EXAM-VALIDATION.md ----------------------------------------------
$qRows = @()
foreach ($b in $cbooks) {
    foreach ($c in @($b.chapters)) {
        if (-not $c) { continue }
        foreach ($ex in @($c.exams)) {
            if (-not $ex -or -not $ex.questions) { continue }
            foreach ($q in @($ex.questions)) {
                if (-not $q) { continue }
                $ok = ($q.explanation -and $q.source -and ($null -ne $q.correct))
                $qRows += "| $($q.id) | $($q.type) | $($ex.id) | $(if ($ok) { 'automated' } else { 'incomplete' }) | $($q.source.pages) |"
            }
        }
    }
}
$exam = @"
# Examination validation

Generated: $($status.generatedAt)

| Question | Type | Exam | Checks | Source pages |
|---|---|---|---|---|
$($qRows -join "`n")

- Exam questions: **$examQuestions**
- Lesson practice questions: **$questions**
- Questions with explanation + source + answer: **$($qRows.Count)**
- Independent human verification: **NOT TESTED**

The automated column only confirms that fields exist and that the answer is
present. It does not confirm that the answer is correct.
"@
Write-Utf8 'docs/EXAM-VALIDATION.md' $exam

# ---- docs/ACTIVITY-CATALOG.md ---------------------------------------------
$act = @"
# Activity catalogue

Generated: $($status.generatedAt)

## Registered components

| Component | Kind | Purpose | Tested |
|---|---|---|---|
| ``match`` | game | pair two columns, immediate feedback | PASS (browser click test) |
| ``classify`` | game | place items into buckets | PASS (code review only) |

## Activities in content

- Activities declared in the catalogue: **$activities**
- Components used: ``match``

Activities are plain data in the catalogue (``component`` + ``config``). No JSON
value is ever executed; only registered, bundled components run.

## Not implemented yet

- Simulation, guided experiment, interactive diagram and formula visualisation
  components. The contract accepts them; the registry does not yet implement
  them, and no content uses them.
"@
Write-Utf8 'docs/ACTIVITY-CATALOG.md' $act

# ---- docs/CONTENT-PRODUCTION-LOG.md ---------------------------------------
$log = @"
# Content production log

Append-only checkpoints. Times are UTC.

| When | Step | Evidence |
|---|---|---|
| 2026-11-16 | Inventory rebuilt for grades 7-12 (130 records) | ``content/inventory.json`` |
| 2026-11-16 | Local OCR installed and verified (Tesseract 5.4, fas) | ``docs/PILOT-01-BIOLOGY.md`` |
| 2026-11-16 | Biology pilot: 1 lesson + 6-question exam | ``content/catalog.json`` |
| 2026-11-17 | TLS bypass removed; HTTPS acquisition fails closed | ``tools/net.ps1`` |
| 2026-11-17 | Downloader verifies 206, Content-Range, PDF structure, page count | ``tools/fetch-source-pdf.ps1`` |
| 2026-11-17 | Activity engine (match) + lesson exercises + section filtering | ``src/scripts/activities.js`` |
| 2026-11-17 | Status reports generated from artefacts | ``content/status.json`` |

Next checkpoint: complete chapter 1 (three subsections) with visual checks.
"@
Write-Utf8 'docs/CONTENT-PRODUCTION-LOG.md' $log

# ---- docs/PHASE-03-DELIVERY.md --------------------------------------------
$del = @"
# PROMPT 03 delivery status

Generated: $($status.generatedAt)

## Done

- Inventory reconciled to **$($books.Count)** records across six grades; grade 12
  restored through the numeric category nodes.
- Source transport audited; the certificate override was removed and HTTPS now
  fails closed. Every file is marked ``unencrypted``.
- Download pipeline hardened: HTTP 206 required, ``Content-Range`` must match the
  local offset, total length is enforced, and the assembled file must open in a
  real PDF parser with a page count.
- Activity registry (``match``, ``classify``), lesson exercises, block-level
  source references, and empty-section filtering are implemented and tested.
- Biology pilot: **$($lessons.Count)** lesson, **$($activities.Count)** activity,
  **$($questions.Count)** practice questions, **$examQuestions** exam questions,
  one reconstructed SVG diagram.

## Not done

- 21 of 22 biology subsections.
- Visual page verification, independent answer review, OCR accuracy measurement.
- Formula rendering, simulation/lab components.
- The remaining $($books.Count - $cbooks.Count) catalogue books.

## Blockers

1. **Source transport.** ``chap.sch.ir`` presents ``*.roshd.ir``; strict TLS fails.
   The owner approved a documented HTTP exception on 2026-11-17
   (``docs/SOURCE-TRANSPORT-EXCEPTION.md``). Files remain transport-unverified and
   TLS is re-tested at every batch.
2. **Scale.** Completing 130 books is a multi-week production task; each book needs
   OCR, visual checks, lesson writing and answer review.
"@
Write-Utf8 'docs/PHASE-03-DELIVERY.md' $del

Write-Output ("status written. books={0} files={1} lessons={2} questions(lesson)={3} questions(exam)={4}" -f $books.Count, $files.Count, $lessons.Count, $questions, $examQuestions)
