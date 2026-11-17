# =============================================================================
#  MEHRAZ — official textbook inventory builder (development tooling)
#
#  Reads the official textbook portal's catalogue over plain HTTP and writes
#  content/inventory.json: every required book for grades 7-12 with its code,
#  grade, track, official page, PDF URL and academic year.
#
#  Nothing here is shipped. The product never fetches anything at runtime.
# =============================================================================
[CmdletBinding()]
param(
    [string]$OutFile = 'content/inventory.json',
    [string]$CacheDir = '.tmp/catalogue',
    [switch]$Refresh
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
. (Join-Path $root 'tools/net.ps1')

$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function Get-HttpText {
    param([string]$Url, [int]$TimeoutMs = 90000)
    $u = [Uri]$Url
    $client = New-Object Net.Sockets.TcpClient
    $client.Connect($u.Host, 80)
    $stream = $client.GetStream()
    $stream.ReadTimeout = $TimeoutMs
    $req = [Text.Encoding]::ASCII.GetBytes("GET $($u.PathAndQuery) HTTP/1.0`r`nHost: $($u.Host)`r`nUser-Agent: $UA`r`nAccept-Encoding: identity`r`n`r`n")
    $stream.Write($req, 0, $req.Length)
    $stream.Flush()
    $ms = New-Object IO.MemoryStream
    $buf = New-Object byte[] 131072
    while (($n = $stream.Read($buf, 0, $buf.Length)) -gt 0) { $ms.Write($buf, 0, $n) }
    $client.Close()
    $resp = Split-HttpResponse -Raw $ms.ToArray()
    if ($resp.Status -ne 200) { throw "HTTP $($resp.Status) for $Url" }
    return [Text.Encoding]::UTF8.GetString($resp.Body)
}

function Get-Cached([string]$Url, [string]$Name) {
    $path = Join-Path $CacheDir "$Name.html"
    if (-not $Refresh -and (Test-Path -LiteralPath $path)) {
        return [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
    }
    $html = Get-HttpText $Url
    New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null
    [IO.File]::WriteAllText($path, $html, (New-Object Text.UTF8Encoding($false)))
    Start-Sleep -Milliseconds 250
    return $html
}

function Decode-Entities([string]$s) {
    $s = $s -replace '&nbsp;', ' '
    $s = $s -replace '&amp;', '&'
    $s = $s -replace '&quot;', '"'
    $s = $s -replace '&#039;', "'"
    $s = $s -replace '&lt;', '<'
    $s = $s -replace '&gt;', '>'
    return ($s -replace '\s+', ' ').Trim()
}

function Clean-Text([string]$s) {
    return (Decode-Entities (($s -replace '<[^>]+>', ' ')))
}

# ---- targets ---------------------------------------------------------------
$base = 'http://chap.sch.ir'
$targets = @(
    @{ grade = 7;  track = $null;          name = 'grade-07'; url = "$base/category/%D8%AF%D9%88%D8%B1%D9%87/%D8%AF%D9%88%D8%B1%D9%87-%D8%A7%D9%88%D9%84-%D9%85%D8%AA%D9%88%D8%B3%D8%B7%D9%87-%D8%AC%D8%AF%DB%8C%D8%AF/%D9%BE%D8%A7%DB%8C%D9%87-%D9%87%D9%81%D8%AA%D9%85" },
    @{ grade = 8;  track = $null;          name = 'grade-08'; url = "$base/category/%D8%AF%D9%88%D8%B1%D9%87/%D8%AF%D9%88%D8%B1%D9%87-%D8%A7%D9%88%D9%84-%D9%85%D8%AA%D9%88%D8%B3%D8%B7%D9%87-%D8%AC%D8%AF%DB%8C%D8%AF/%D9%BE%D8%A7%DB%8C%D9%87-%D9%87%D8%B4%D8%AA%D9%85" },
    @{ grade = 9;  track = $null;          name = 'grade-09'; url = "$base/category/%D8%AF%D9%88%D8%B1%D9%87/%D8%AF%D9%88%D8%B1%D9%87-%D8%A7%D9%88%D9%84-%D9%85%D8%AA%D9%88%D8%B3%D8%B7%D9%87-%D8%AC%D8%AF%DB%8C%D8%AF/%D9%BE%D8%A7%DB%8C%D9%87-%D9%86%D9%87%D9%85" }
)

$tracks = @(
    @{ key = 'math';         slug = '%D8%B1%DB%8C%D8%A7%D8%B6%DB%8C-%D9%81%DB%8C%D8%B2%DB%8C%DA%A9' },
    @{ key = 'experimental'; slug = '%D8%B9%D9%84%D9%88%D9%85-%D8%AA%D8%AC%D8%B1%D8%A8%DB%8C' },
    @{ key = 'humanities';   slug = '%D8%B9%D9%84%D9%88%D9%85-%D8%A7%D9%86%D8%B3%D8%A7%D9%86%DB%8C' }
)
$years = @(
    @{ grade = 10; slug = '%D8%B3%D8%A7%D9%84-%D8%AF%D9%88%D9%85' },
    @{ grade = 11; slug = '%D8%B3%D8%A7%D9%84-%D8%B3%D9%88%D9%85' }
    
)

# The portal's year slugs are shifted by one grade: سال-دوم renders پایه دهم and
# سال-سوم renders پایه یازدهم. Grade 12 is only reachable through the numeric
# category nodes that the main menu links to.
$grade12 = @(
    @{ grade = 12; track = 'math';         name = 'grade-12-math-cat711';         url = "$base/category/%D8%AF%D9%88%D8%B1%D9%87/711" },
    @{ grade = 12; track = 'experimental'; name = 'grade-12-experimental-cat712'; url = "$base/category/%D8%AF%D9%88%D8%B1%D9%87/712" },
    @{ grade = 12; track = 'humanities';   name = 'grade-12-humanities-cat709';   url = "$base/category/%D8%AF%D9%88%D8%B1%D9%87/709" }
)
$targets += $grade12
$prefix = "$base/category/%D8%AF%D9%88%D8%B1%D9%87/%D8%AF%D9%88%D8%B1%D9%87-%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D9%85%D8%AA%D9%88%D8%B3%D8%B7%D9%87/%D9%85%D8%AA%D9%88%D8%B3%D8%B7%D9%87-%D9%86%D8%B8%D8%B1%DB%8C"
foreach ($t in $tracks) {
    foreach ($y in $years) {
        $targets += @{
            grade = $y.grade
            track = $t.key
            name  = ('grade-{0}-{1}-y{2}' -f $y.grade, $t.key, $y.grade)
            url   = "$prefix/$($t.slug)/$($y.slug)"
        }
    }
}

# ---- scrape ----------------------------------------------------------------
$books = New-Object System.Collections.Generic.List[object]
$report = New-Object System.Collections.Generic.List[object]
$seen = @{}

foreach ($target in $targets) {
    Write-Host ("[{0}] {1}" -f $target.name, $target.url) -ForegroundColor Cyan
    try {
        $html = Get-Cached -Url $target.url -Name $target.name
        # Drupal listings paginate; page 2 holds books that the first page hides.
        for ($pg = 1; $pg -le 2; $pg++) {
            try {
                $html += Get-Cached -Url ($target.url + '?page=' + $pg) -Name ($target.name + '-p' + $pg)
            } catch { break }
        }
    } catch {
        Write-Host ("  FAILED: " + $_.Exception.Message) -ForegroundColor Red
        $report.Add([pscustomobject]@{ target = $target.name; ok = $false; error = $_.Exception.Message })
        continue
    }

    $h1 = Clean-Text ([regex]::Match($html, '<h1[^>]*>([\s\S]*?)</h1>').Groups[1].Value)
    $h1Grade = $null
    if ($h1 -match 'دوازدهم') { $h1Grade = 12 } elseif ($h1 -match 'یازدهم') { $h1Grade = 11 } elseif ($h1 -match 'دهم') { $h1Grade = 10 } elseif ($h1 -match 'نهم') { $h1Grade = 9 } elseif ($h1 -match 'هشتم') { $h1Grade = 8 } elseif ($h1 -match 'هفتم') { $h1Grade = 7 }
    $cells = [regex]::Matches($html, '<td class="col-\d+"[\s\S]*?</td>')
    $count = 0

    foreach ($cell in $cells) {
        $c = $cell.Value
        $link = [regex]::Match($c, '<a href="(/books/\d+)">([^<]+)</a>')
        if (-not $link.Success) { continue }

        $bookPage = $link.Groups[1].Value
        $title = Decode-Entities $link.Groups[2].Value
        $codeMatch = [regex]::Match($c, 'views-field-field-book-code[\s\S]*?field-content">([^<]+)<')
        $code = if ($codeMatch.Success) { Decode-Entities $codeMatch.Groups[1].Value } else { $null }
        $cover = [regex]::Match($c, 'src="([^"]*book_image/([0-9]{4}-[0-9]{4})/[^"]+)"')
        $yearHint = if ($cover.Success) { $cover.Groups[2].Value } else { $null }
        $slug = ($bookPage -replace '^/books/', '')
        $key = "$($target.grade)|$code|$slug"
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true

        $isSpecial = ($title -match 'استثنایی')
        $books.Add([pscustomobject]@{
            bookPageId   = [int]$slug
            specialEducation = $isSpecial
            gradeFromCatalogue = $h1Grade
            gradeConfidence = if ($h1Grade -eq $target.grade) { 'verified' } else { 'taxonomy-mismatch' }
            bookPageUrl  = "$base$bookPage"
            code         = $code
            title        = $title
            grade        = [int]$target.grade
            track        = $target.track
            categoryName = $target.name
            categoryH1   = $h1
            academicYear = $yearHint
            pdfUrl       = $null
            sizeBytes    = $null
            sha256       = $null
            hashStatus   = 'pending'
            sourceStatus = 'catalogue'
            transportSecurity = 'unencrypted'
        })
        $count++
    }
    Write-Host ("  ok: h1='{0}' books={1}" -f $h1, $count) -ForegroundColor Green
    $report.Add([pscustomobject]@{ target = $target.name; ok = $true; h1 = $h1; books = $count })
}

Write-Host ("catalogue books: " + $books.Count) -ForegroundColor Yellow

# ---- resolve the official PDF for each book --------------------------------
$i = 0
foreach ($b in $books) {
    $i++
    try {
        $pageName = 'book-' + $b.bookPageId
        $pageHtml = Get-Cached -Url $b.bookPageUrl -Name $pageName
        $pdf = [regex]::Match($pageHtml, 'href="(http://chap\.sch\.ir/sites/default/files/lbooks/[^"]+\.pdf)"')
        if ($pdf.Success) {
            $b.pdfUrl = $pdf.Groups[1].Value
            $b.sourceStatus = 'official-pdf-located'
            $ym = [regex]::Match($b.pdfUrl, '/lbooks/([0-9]{4}-[0-9]{4})/')
            if ($ym.Success -and -not $b.academicYear) { $b.academicYear = $ym.Groups[1].Value }
        } else {
            $b.sourceStatus = 'pdf-not-published'
        }
        Write-Host ("  [{0}/{1}] {2} -> {3}" -f $i, $books.Count, $b.title, $(if ($b.pdfUrl) { 'pdf' } else { 'NONE' }))
    } catch {
        $b.sourceStatus = 'book-page-error'
        Write-Host ("  [{0}/{1}] {2} -> ERROR {3}" -f $i, $books.Count, $b.title, $_.Exception.Message) -ForegroundColor Red
    }
}

# ---- merge shared books across tracks -------------------------------------
# General subjects are listed on every track page of a grade. One physical
# textbook must stay one record; `tracks` lists every track it is required for.
$byId = @{}
$unique = New-Object System.Collections.Generic.List[object]
foreach ($b in $books) {
    $id = [string]$b.bookPageId
    if ($byId.ContainsKey($id)) {
        $rec = $byId[$id]
        if ($b.track -and ($rec.tracks -notcontains $b.track)) { $rec.tracks += $b.track }
        continue
    }
    $tracks = @()
    if ($b.track) { $tracks += $b.track }
    $b | Add-Member -NotePropertyName tracks -NotePropertyValue $tracks -Force
    $byId[$id] = $b
    $unique.Add($b)
}
foreach ($b in $unique) {
    if ($b.tracks.Count -gt 1) { $b.track = $null }
}
$books = $unique
Write-Host ("unique books after merge: " + $books.Count) -ForegroundColor Yellow

# Track membership comes from the listing pages where a book actually appeared.
# An earlier title-regex pass guessed sharing and got 12 of 26 grade-10 records
# wrong, so it was removed: shared books are the ones the portal repeats.

# ---- write the inventory ---------------------------------------------------
$doc = [ordered]@{
    schemaVersion  = 1
    generator      = 'tools/build-inventory.ps1'
    generatedAt    = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    sourcePortal   = 'http://chap.sch.ir'
    coverage       = 'partial'
    sourceTransport = 'unencrypted'
    sourceTransportNote = 'The portal refuses a valid TLS certificate for chap.sch.ir (served certificate is for *.roshd.ir). Catalogue metadata and PDF links were therefore read over plain HTTP and are marked unencrypted. File hashes prove identity of what was received, not publisher authentication.'
    caveats        = @(
        'The portal year terms are shifted: sal-dovom renders paye dahom and sal-savom renders paye yazdahom; sal-aval is empty. Grade 12 is reachable only through the numeric category nodes 711/712/709.'
        'Grade attribution is therefore taken from each listing page heading (gradeFromCatalogue) and a gradeConfidence flag records whether it matched the requested grade.',
        'Every official PDF inspected so far is a page-image scan with no text layer and no embedded fonts, so text extraction requires OCR. OCR is unavailable in this environment (no tesseract; Python and Node runtimes are non-functional), which is why no lesson content has been produced.'
    )
    academicYear   = ($books | Where-Object { $_.academicYear } | Group-Object academicYear | Sort-Object Count -Descending | Select-Object -First 1).Name
    totals         = [ordered]@{
        books    = ($books | Where-Object { -not $_.specialEducation }).Count
        specialEducation = ($books | Where-Object { $_.specialEducation }).Count
        gradeVerified = ($books | Where-Object { $_.gradeConfidence -eq 'verified' }).Count
        withPdf  = ($books | Where-Object { $_.pdfUrl }).Count
        withoutPdf = ($books | Where-Object { -not $_.pdfUrl }).Count
        byGrade  = ($books | Group-Object grade | ForEach-Object { [ordered]@{ grade = [int]$_.Name; count = $_.Count } })
    }
    report         = $report
    books          = $books
}

$json = $doc | ConvertTo-Json -Depth 8
$outPath = Join-Path $root $OutFile
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outPath) | Out-Null
[IO.File]::WriteAllText($outPath, $json, (New-Object Text.UTF8Encoding($false)))
Write-Host ("written: {0}  ({1} books, {2} with PDF)" -f $OutFile, $books.Count, ($books | Where-Object { $_.pdfUrl }).Count) -ForegroundColor Yellow
