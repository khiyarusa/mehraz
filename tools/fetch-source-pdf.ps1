# MEHRAZ dev tooling (never shipped): resumable download for official PDFs.
# The portal sometimes closes the connection early; a naive download produces a
# truncated PDF with no %%EOF. This fetches with Range requests until complete.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$OutFile,
    [int]$MaxRounds = 40
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutFile) | Out-Null

function Get-RemoteLength([string]$u) {
    $req = [Net.HttpWebRequest]::Create($u)
    $req.Method = 'HEAD'
    $req.Timeout = 60000
    $resp = $req.GetResponse()
    try { return [int64]$resp.ContentLength } finally { $resp.Close() }
}

$total = Get-RemoteLength $Url
Write-Output ("remote length: {0}" -f $total)

if (Test-Path -LiteralPath $OutFile) {
    $have = (Get-Item -LiteralPath $OutFile).Length
    if ($have -ge $total) { Write-Output 'already complete'; return }
} else {
    [IO.File]::WriteAllBytes($OutFile, @())
}

for ($round = 0; $round -lt $MaxRounds; $round++) {
    $have = (Get-Item -LiteralPath $OutFile).Length
    if ($have -ge $total) { break }
    Write-Output ("round {0}: have {1}/{2}" -f $round, $have, $total)

    $req = [Net.HttpWebRequest]::Create($Url)
    $req.Timeout = 120000
    $req.ReadWriteTimeout = 120000
    $req.AddRange($have)
    $resp = $req.GetResponse()
    $fs = [IO.File]::Open($OutFile, [IO.FileMode]::Append, [IO.FileAccess]::Write)
    try {
        $stream = $resp.GetResponseStream()
        $buf = New-Object byte[] 131072
        while (($n = $stream.Read($buf, 0, $buf.Length)) -gt 0) {
            $fs.Write($buf, 0, $n)
        }
    } finally {
        $fs.Close()
        $resp.Close()
    }
}

$final = (Get-Item -LiteralPath $OutFile).Length
$bytes = [IO.File]::ReadAllBytes($OutFile)
$tail = [Text.Encoding]::GetEncoding(28591).GetString($bytes, [Math]::Max(0, $bytes.Length - 64), 64)
$eof = $tail.Contains('%%EOF')
Write-Output ("final: {0}/{1}  EOF={2}" -f $final, $total, $eof)
if (-not $eof) { throw 'download incomplete: no %%EOF marker' }
