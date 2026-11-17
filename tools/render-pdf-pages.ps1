# MEHRAZ dev tooling (never shipped): render official textbook PDF pages to PNG
# using the Windows PDF API, so they can be OCR'd locally.
# Usage: powershell -File tools/render-pdf-pages.ps1 -Pdf <path> -OutDir <dir> -From 0 -To 0 -Width 2200
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Pdf,
    [Parameter(Mandatory = $true)][string]$OutDir,
    [int]$From = 0,
    [int]$To = -1,
    [int]$Width = 2200,
    [switch]$ProbeOnly
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]

function AwaitOp($op, $type) {
    $m = $asTaskGeneric.MakeGenericMethod($type)
    $t = $m.Invoke($null, @($op))
    try {
        $t.Wait(-1) | Out-Null
    } catch {
        $inner = $t.Exception
        while ($inner -and $inner.InnerException) { $inner = $inner.InnerException }
        throw ("WinRT await failed for {0}: {1}" -f $type.Name, $inner.Message)
    }
    return $t.Result
}

function AwaitAct($act) {
    $t = $asTaskAction.Invoke($null, @($act))
    $t.Wait(-1) | Out-Null
}

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null

$pdfFull = (Resolve-Path -LiteralPath $Pdf).Path
$file = AwaitOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdfFull)) ([Windows.Storage.StorageFile])
$doc = AwaitOp ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
if ($ProbeOnly) {
    Write-Output ('PROBE_PAGES=' + $doc.PageCount)
    exit 0
}
$last = if ($To -lt 0) { $doc.PageCount - 1 } else { [Math]::Min($To, $doc.PageCount - 1) }
Write-Output ("pages: {0}  rendering {1}..{2} at width {3}" -f $doc.PageCount, $From, $last, $Width)

for ($i = $From; $i -le $last; $i++) {
    $page = $doc.GetPage([uint32]$i)
    $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
    $opts.DestinationWidth = [uint32]$Width
    $ms = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
    try {
        AwaitAct ($page.RenderToStreamAsync($ms, $opts))
        $ms.Seek(0)
        $net = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($ms)
        $out = Join-Path $OutDir ("page-{0:d4}.png" -f $i)
        $fs = [IO.File]::Create($out)
        try { $net.CopyTo($fs) } finally { $fs.Close() }
        $page.Dispose()
        Write-Output ("  page {0}: {1} bytes" -f $i, (Get-Item $out).Length)
    } finally {
        $ms.Dispose()
    }
}
