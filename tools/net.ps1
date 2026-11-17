# =============================================================================
#  MEHRAZ content pipeline — minimal HTTPS client
#  Development tooling only. Never shipped, never used at runtime.
#
#  Strict transport policy: certificate chain, hostname and validity are always
#  validated by the operating system. There is no override, no "ignore errors"
#  switch and no silent fallback to plain HTTP. If the official portal cannot
#  present a valid certificate for its own hostname, acquisition stops and the
#  limitation is reported instead of being bypassed.
# =============================================================================

# SslStream lives in System.dll, which PowerShell has already loaded — no Add-Type needed.

$script:UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function Get-HttpsRaw {
    param(
        [Parameter(Mandatory)][string]$ServerName,
        [string]$Path = '/',
        [int]$Port = 443,
        [int]$TimeoutMs = 60000
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($ServerName, $Port, $null, $null)
        if (-not $iar.AsyncWaitHandle.WaitOne($TimeoutMs)) { throw "TCP connect timeout to $ServerName`:$Port" }
        $client.EndConnect($iar)
    } catch {
        $client.Close()
        throw
    }

    # No callback: SslStream uses the system policy (chain, hostname, validity).
    $ssl = New-Object System.Net.Security.SslStream($client.GetStream(), $false)
    try {
        $ssl.AuthenticateAsClient($ServerName)
    } catch {
        $msg = $_.Exception.Message
        $inner = if ($_.Exception.InnerException) { $_.Exception.InnerException.Message } else { $msg }
        $ssl.Dispose(); $client.Close()
        throw "TLS validation failed for $ServerName`:$Port - $inner. Source transport is not authenticated; refusing to continue."
    }
    $ssl.ReadTimeout = $TimeoutMs

    $request = @(
        "GET $Path HTTP/1.1",
        "Host: $ServerName",
        "User-Agent: $script:UserAgent",
        "Accept: text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
        "Accept-Language: fa-IR,fa;q=0.9,en;q=0.7",
        "Accept-Encoding: identity",
        "Connection: close",
        "",
        ""
    ) -join "`r`n"

    $bytes = [Text.Encoding]::ASCII.GetBytes($request)
    $ssl.Write($bytes, 0, $bytes.Length)
    $ssl.Flush()

    $buffer = New-Object byte[] 65536
    $ms = New-Object System.IO.MemoryStream
    try {
        while ($true) {
            $read = $ssl.Read($buffer, 0, $buffer.Length)
            if ($read -le 0) { break }
            $ms.Write($buffer, 0, $read)
        }
    } catch {
        # A short read after a complete body is normal on some servers.
        if ($ms.Length -eq 0) { throw }
    } finally {
        $ssl.Dispose(); $client.Close()
    }

    return $ms.ToArray()
}

function Split-HttpResponse {
    param([byte[]]$Raw)

    # Locate CRLFCRLF
    $sep = -1
    for ($i = 0; $i -lt $Raw.Length - 3; $i++) {
        if ($Raw[$i] -eq 13 -and $Raw[$i+1] -eq 10 -and $Raw[$i+2] -eq 13 -and $Raw[$i+3] -eq 10) { $sep = $i; break }
    }
    if ($sep -lt 0) { throw 'Malformed HTTP response (no header terminator)' }

    $headerText = [Text.Encoding]::ASCII.GetString($Raw, 0, $sep)
    $lines = $headerText -split "`r`n"
    $status = 0
    if ($lines[0] -match '^HTTP/\d\.\d\s+(\d{3})') { $status = [int]$Matches[1] }

    $headers = @{}
    for ($i = 1; $i -lt $lines.Count; $i++) {
        $idx = $lines[$i].IndexOf(':')
        if ($idx -gt 0) {
            $k = $lines[$i].Substring(0, $idx).Trim().ToLowerInvariant()
            $v = $lines[$i].Substring($idx + 1).Trim()
            if ($headers.ContainsKey($k)) { $headers[$k] = $headers[$k] + ', ' + $v } else { $headers[$k] = $v }
        }
    }

    $bodyOffset = $sep + 4
    $bodyLength = $Raw.Length - $bodyOffset
    $body = New-Object byte[] $bodyLength
    if ($bodyLength -gt 0) { [Array]::Copy($Raw, $bodyOffset, $body, 0, $bodyLength) }

    # de-chunk when needed
    if ($headers.ContainsKey('transfer-encoding') -and $headers['transfer-encoding'] -match 'chunked') {
        $out = New-Object System.IO.MemoryStream
        $pos = 0
        while ($pos -lt $body.Length) {
            $lineEnd = -1
            for ($j = $pos; $j -lt $body.Length - 1; $j++) {
                if ($body[$j] -eq 13 -and $body[$j+1] -eq 10) { $lineEnd = $j; break }
            }
            if ($lineEnd -lt 0) { break }
            $sizeHex = [Text.Encoding]::ASCII.GetString($body, $pos, $lineEnd - $pos).Split(';')[0].Trim()
            if ([string]::IsNullOrWhiteSpace($sizeHex)) { break }
            $size = [Convert]::ToInt32($sizeHex, 16)
            if ($size -eq 0) { break }
            $start = $lineEnd + 2
            $out.Write($body, $start, $size)
            $pos = $start + $size + 2
        }
        $body = $out.ToArray()
    }

    return [pscustomobject]@{
        Status  = $status
        Headers = $headers
        Body    = $body
    }
}

function Get-WebText {
    param(
        [Parameter(Mandatory)][string]$Url,
        [int]$TimeoutMs = 60000
    )
    $uri = [Uri]$Url
    $path = $uri.PathAndQuery
    $raw = Get-HttpsRaw -ServerName $uri.Host -Path $path -TimeoutMs $TimeoutMs
    $resp = Split-HttpResponse -Raw $raw
    if ($resp.Status -ne 200) { throw "HTTP $($resp.Status) for $Url" }

    $charset = 'utf-8'
    if ($resp.Headers.ContainsKey('content-type') -and $resp.Headers['content-type'] -match 'charset=([\w-]+)') {
        $charset = $Matches[1]
    }
    $enc = [Text.Encoding]::GetEncoding($charset)
    return $enc.GetString($resp.Body)
}

function Save-WebFile {
    param(
        [Parameter(Mandatory)][string]$Url,
        [Parameter(Mandatory)][string]$OutFile,
        [int]$TimeoutMs = 180000
    )
    $uri = [Uri]$Url
    $raw = Get-HttpsRaw -ServerName $uri.Host -Path $uri.PathAndQuery -TimeoutMs $TimeoutMs
    $resp = Split-HttpResponse -Raw $raw
    if ($resp.Status -ne 200) { throw "HTTP $($resp.Status) for $Url" }
    $dir = Split-Path -Parent $OutFile
    if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllBytes($OutFile, $resp.Body)
    return [pscustomobject]@{
        Path   = $OutFile
        Bytes  = $resp.Body.Length
        Type   = if ($resp.Headers.ContainsKey('content-type')) { $resp.Headers['content-type'] } else { '' }
    }
}
