# Official textbook inventory â€” status

Generated: 2026-11-17T16:34:45Z Â· academic year 1405-1406
Source: `content/inventory.json` (built by `tools/build-inventory.ps1`)

## Records

| Grade | Records |
|---|---:|
| 10 | 27 |
| 11 | 29 |
| 12 | 28 |
| 7 | 22 |
| 8 | 22 |
| 9 | 20 |
| **Total** | **148** |

- Records with a resolved official PDF URL: **147**
- Grade attribution confirmed against the listing-page heading: **148**
- Transport: **** for all 148 records

## What these numbers do not prove

- A catalogue record is not a downloaded file.
- A resolved PDF URL is not a verified source.
- The portal list is not a legally mandated curriculum list.
- Shared general textbooks are listed once per grade and marked with a `tracks` array.

## Source transport

The portal refuses strict TLS for its own hostname. The served certificate is
issued for `*.roshd.ir`; validation reports `RemoteCertificateNameMismatch`
and `RemoteCertificateChainErrors`. Catalogue pages and PDFs are therefore read
over plain HTTP and every record carries `transportSecurity: "unencrypted"`.
Hashes identify the received file; they do not authenticate the publisher.

See `docs/SOURCE-MANIFEST.md` for the per-file evidence.