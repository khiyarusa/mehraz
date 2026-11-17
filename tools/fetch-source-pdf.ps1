# MEHRAZ dev tooling (never shipped): verified, resumable download of official PDFs.
#
# Why this exists: the portal sometimes closes the connection early, and a naive
# download produces a truncated PDF that still looks like a file. This tool
# proves what it received before calling the file complete:
#   1. HTTP 206 for every ranged request, with Content-Range starting exactly at
#      the byte already on disk (a 200 response is rejected: it would duplicate
#      the whole document).
#   2. The declared total length never changes between rounds.
#   3. The assembled file starts with %PDF-, ends with %%EOF and has the declared
#      byte length.
#   4. A real PDF parser (Windows.Data.Pdf) opens it and reports a page count.
#   5. SHA-256 is recorded, and the transport scheme is recorded as-is: an
#      http:// source is marked "unencrypted" and never called authenticated.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$OutFile,
    [int]$MaxRounds = 60,
    [switch]$VerifyOnly,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutFile) | Out-Null

$reportPath = "$OutFile.download.json"
$uri = [Uri]$Url
$transport = if ($uri.Scheme -eq 'https') { 'tls' } else { 'unencrypted' }

function Get-RemoteInfo([string]$u) {
    $req = [Net.HttpWebRequest]::Create($u)
    $req.Method = 'HEAD'
    $req.Timeout = 60000
    $resp = $req.GetResponse()
    try {
        return [pscustomobject]@{
            Length      = [int64]$resp.ContentLength
            AcceptRanges = [string]$resp.Headers['Accept-Ranges']
            Status      = [int]$resp.StatusCode
        }
    } finally { $resp.Close() }
}

function Test-PdfSignature([string]$path) {
    $fs = [IO.File]::OpenRead($path)
    try {
        $buf = New-Object byte[] 5
        $n = $fs.Read($buf, 0, 5)
        if ($n -lt 5) { return $false }
        return ([Text.Encoding]::ASCII.GetString($buf) -eq '%PDF-')
    } finally { $fs.Close() }
}

function Get-LastBytes([string]$path, [int]$count) {
    $fs = [IO.File]::OpenRead($path)
    try {
        $len = $fs.Length
        $take = [Math]::Min([int64]$count, $len)
        $fs.Seek($len - $take, [IO.SeekOrigin]::Begin) | Out-Null
        $buf = New-Object byte[] $take
        $fs.Read($buf, 0, $take) | Out-Null
        return [Text.Encoding]::GetEncoding(28591).GetString($buf)
    } finally { $fs.Close() }
}

function Get-PdfPageCount([string]$path) {
    # A structural check, not a signature grep: the Windows PDF parser must open
    # the file and expose a page tree.
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
    [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null

    $await = {
        param($op, $type)
        $m = $asTaskGeneric.MakeGenericMethod($type)
        $t = $m.Invoke($null, @($op))
        $t.Wait(-1) | Out-Null
        $t.Result
    }

    try {
        $file = & $await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path -LiteralPath $path).Path)) ([Windows.Storage.StorageFile])
        $doc = & $await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
        return [int]$doc.PageCount
    } catch {
        return $null
    }
}

function Write-Report($obj) {
    $json = $obj | ConvertTo-Json -Depth 6
    [IO.File]::WriteAllText($reportPath, $json, (New-Object Text.UTF8Encoding($false)))
}

function Assert-Complete([string]$path, [int64]$expected) {
    $size = (Get-Item -LiteralPath $path).Length
    if ($size -ne $expected) { throw "size mismatch: have $size, expected $expected" }
    if (-not (Test-PdfSignature $path)) { throw 'missing %PDF- signature' }
    $tail = Get-LastBytes $path 64
    if (-not $tail.Contains('%%EOF')) { throw 'missing %%EOF marker' }
    $pages = Get-PdfPageCount $path
    if (-not $pages -or $pages -lt 1) { throw 'PDF parser could not read a page tree' }
    return $pages
}

$info = Get-RemoteInfo $Url
if ($info.Length -le 0) { throw 'server did not declare a content length' }
Write-Output ("remote: {0} bytes, ranges: {1}, transport: {2}" -f $info.Length, $info.AcceptRanges, $transport)

if ($VerifyOnly) {
    if (-not (Test-Path -LiteralPath $OutFile)) { throw 'file not found for verification' }
    $pages = Assert-Complete $OutFile $info.Length
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutFile).Hash.ToLower()
    Write-Output ("verified: {0} bytes, {1} pages, sha256={2}" -f $info.Length, $pages, $hash)
    exit 0
}

if ($Force -and (Test-Path -LiteralPath $OutFile)) { Remove-Item -LiteralPath $OutFile -Force }
if (-not (Test-Path -LiteralPath $OutFile)) { [IO.File]::WriteAllBytes($OutFile, @()) }

$rounds = 0
$expectedTotal = $info.Length
while ($true) {
    $have = (Get-Item -LiteralPath $OutFile).Length
    if ($have -eq $expectedTotal) { break }
    if ($have -gt $expectedTotal) { throw "local file is larger than the remote resource ($have > $expectedTotal)" }
    if ($rounds -ge $MaxRounds) { throw "gave up after $MaxRounds rounds at $have/$expectedTotal" }
    $rounds++

    $req = [Net.HttpWebRequest]::Create($Url)
    $req.Timeout = 120000
    $req.ReadWriteTimeout = 120000
    $req.AddRange($have)
    $resp = $req.GetResponse()
    try {
        $status = [int]$resp.StatusCode
        if ($status -ne 206) {
            throw "range request returned HTTP $status (expected 206) at offset $have; refusing to append a full body"
        }
        $rangeHeader = [string]$resp.Headers['Content-Range']
        if ($rangeHeader -notmatch '^bytes\s+(\d+)-(\d+)/(\d+|\*)$') {
            throw "unreadable Content-Range: '$rangeHeader'"
        }
        $start = [int64]$Matches[1]
        $end = [int64]$Matches[2]
        $total = if ($Matches[3] -eq '*') { $expectedTotal } else { [int64]$Matches[3] }
        if ($total -ne $expectedTotal) { throw "remote total changed: $total vs $expectedTotal" }
        if ($start -ne $have) { throw "Content-Range starts at $start, local file ends at $have" }
        $chunkLength = [int64]$resp.ContentLength
        if ($chunkLength -ne ($end - $start + 1)) { throw "Content-Length $chunkLength does not match range $start-$end" }

        $fs = [IO.File]::Open($OutFile, [IO.FileMode]::Append, [IO.FileAccess]::Write)
        $written = 0
        try {
            $stream = $resp.GetResponseStream()
            $buf = New-Object byte[] 131072
            while (($n = $stream.Read($buf, 0, $buf.Length)) -gt 0) {
                $fs.Write($buf, 0, $n)
                $written += $n
            }
        } finally {
            $fs.Close()
        }
        if ($written -ne $chunkLength) { throw "wrote $written bytes for a $chunkLength-byte range" }
        Write-Output ("  round {0}: +{1} bytes -> {2}/{3}" -f $rounds, $written, ((Get-Item $OutFile).Length), $expectedTotal)
    } finally {
        $resp.Close()
    }
}

$pages = Assert-Complete $OutFile $expectedTotal
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutFile).Hash.ToLower()
Write-Report ([ordered]@{
    url               = $Url
    transportSecurity = $transport
    bytes             = $expectedTotal
    sha256            = $hash
    pages             = $pages
    rounds            = $rounds
    verifiedAt        = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    status            = 'complete-and-structurally-valid'
    note              = if ($transport -eq 'unencrypted') { 'Downloaded over plain HTTP: the file identity is proven by its hash, but the publisher is not cryptographically authenticated.' } else { 'Downloaded over TLS.' }
})
Write-Output ("complete: {0} bytes, {1} pages, sha256={2}" -f $expectedTotal, $pages, $hash)
Write-Output ("report: {0}" -f $reportPath)
