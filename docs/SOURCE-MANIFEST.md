# Source manifest and transport audit

Generated: 2026-11-18T17:27:52Z
Machine-readable source: `content/source-manifest.json`

## Files

| Code | Title | Bytes | SHA-256 | Pages | Text layer | OCR | Transport |
|---|---|---:|---|---:|---|---|---|
| 701 | آموزش قرآن (هفتم) | 5050896 | a349cdd80fb7… |  | scan | blocked-needs-ocr | unencrypted |
| 706 | علوم تجربی (هفتم) | 11795385 | da0b1c4277de… |  | scan | blocked-needs-ocr | unencrypted |
| 705 | ریاضی (هفتم) | 35916566 | bd29fabf28a0… | 135 | scan | blocked-needs-ocr | unencrypted |
| 110216 | زیست‌شناسی (1) | 6775781 | 58f6685b03e6… | 120 | scan | ocr-done-pilot | unencrypted |

## TLS audit (2026-11-17)

- `https://chap.sch.ir/` fails strict validation.
- Certificate subject: `CN=*.roshd.ir`; SAN: `*.roshd.ir`, `roshd.ir`.
- Validation errors: `RemoteCertificateNameMismatch`, `RemoteCertificateChainErrors`.
- `tools/net.ps1` no longer contains any certificate override; HTTPS acquisition
  now fails closed with an explicit message.
- No silent downgrade is performed by the tooling; HTTP URLs are recorded as
  `unencrypted` at the point of download.

## Consequence

Files already on disk were downloaded over plain HTTP. Their SHA-256 proves what
was received; it does not prove that the file came from the publisher. The owner
approved a documented HTTP exception on 2026-11-17
(`docs/SOURCE-TRANSPORT-EXCEPTION.md`); every file remains labelled
**transport-unverified** and no UI or report claims publisher authentication.
The exception is limited to `chap.sch.ir` and to local acquisition.