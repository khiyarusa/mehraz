# MEHRAZ dev tooling (never shipped): merge authored lesson files into the
# content catalogue. Lesson files live in content/lessons/*.json and are
# attached to their book/chapter by id. Re-running is idempotent.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$catalogPath = Join-Path $root 'content/catalog.json'
$lessonDir = Join-Path $root 'content/lessons'

$catalog = [IO.File]::ReadAllText($catalogPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
if (-not (Test-Path -LiteralPath $lessonDir)) { Write-Output 'no lesson files'; return }

$added = 0
$replaced = 0
foreach ($f in Get-ChildItem -LiteralPath $lessonDir -Filter '*.json' | Sort-Object Name) {
    try {
        $d = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8) | ConvertFrom-Json
    } catch {
        Write-Output ("SKIP {0}: invalid JSON ({1})" -f $f.Name, $_.Exception.Message)
        continue
    }
    if (-not $d.bookId -or -not $d.chapterId -or -not $d.lesson -or -not $d.lesson.id) {
        Write-Output ("SKIP {0}: missing bookId/chapterId/lesson.id" -f $f.Name)
        continue
    }
    $book = @($catalog.books | Where-Object { $_.id -eq $d.bookId })[0]
    if (-not $book) { Write-Output ("SKIP {0}: book {1} not found" -f $f.Name, $d.bookId); continue }
    $chapter = @($book.chapters | Where-Object { $_.id -eq $d.chapterId })[0]
    if (-not $chapter) { Write-Output ("SKIP {0}: chapter {1} not found" -f $f.Name, $d.chapterId); continue }

    $lesson = $d.lesson
    $list = @($chapter.lessons)
    $idx = -1
    for ($i = 0; $i -lt $list.Count; $i++) {
        if ($list[$i].id -eq $lesson.id) { $idx = $i; break }
    }
    if ($idx -ge 0) { $list[$idx] = $lesson; $replaced++ }
    else { $list += $lesson; $added++ }
    $chapter.lessons = @($list | Sort-Object { [int]$_.order })

    if ($d.exam -and $d.exam.id) {
        $exams = @($chapter.exams)
        if (-not ($exams | Where-Object { $_.id -eq $d.exam.id })) {
            $chapter.exams = @($exams + $d.exam)
        } else {
            $chapter.exams = @($exams | ForEach-Object { if ($_.id -eq $d.exam.id) { $d.exam } else { $_ } })
        }
    }
    Write-Output ("merged {0}: lesson {1}" -f $f.Name, $lesson.id)
}

$catalog.updatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
[IO.File]::WriteAllText($catalogPath, ($catalog | ConvertTo-Json -Depth 24), (New-Object Text.UTF8Encoding($false)))
Write-Output ("catalogue: {0} added, {1} replaced" -f $added, $replaced)
