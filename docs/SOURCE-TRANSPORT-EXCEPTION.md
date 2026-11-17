# Source transport exception — owner-approved

**Decision date:** 2026-11-17
**Scope:** acquisition of official textbook files and catalogue metadata from `chap.sch.ir` only.
**Status:** approved by the repository owner in the PROMPT 03.1 working session.

---

## 1. What was observed

Strict TLS to the official portal fails:

| Item | Value |
| --- | --- |
| URL tested | `https://chap.sch.ir/` |
| Result | `Could not establish trust relationship for the SSL/TLS secure channel` |
| Certificate subject | `CN=*.roshd.ir` |
| Certificate SAN | `*.roshd.ir`, `roshd.ir` |
| Validation errors | `RemoteCertificateNameMismatch`, `RemoteCertificateChainErrors` |
| Chain issuer | `CN=Certum Domain Validation CA SHA2` |

The portal does not present a certificate valid for its own hostname. There is no
authenticated HTTPS path to this host from this environment.

## 2. What is permitted under this exception

1. Reading public catalogue pages over `http://chap.sch.ir` and resolving official
   PDF links.
2. Downloading official PDFs over `http://chap.sch.ir` **only**.
3. Recording those files with `transportSecurity: "unencrypted"` and the permanent
   label **transport-unverified**.

## 3. What remains forbidden

- Any host other than `chap.sch.ir` (no mirrors, no aggregators, no caches).
- Re-enabling a certificate override, `AllowBadCertificate`, or host-validation
  bypass anywhere in the tooling.
- Describing a downloaded file as "authenticated", "verified source" or
  "publisher-confirmed".
- Publishing original PDFs or page scans in the repository or in `start.html`.
- Bypassing CAPTCHAs, rate limits or access controls.
- Treating the hash as proof of origin: SHA-256 proves **what was received**, not
  **who published it**.

## 4. Compensating controls (mandatory)

| Control | Implementation |
| --- | --- |
| Single host allow-list | `tools/fetch-source-pdf.ps1` takes an explicit URL and is only used with `chap.sch.ir` |
| Download integrity | HTTP 206 + `Content-Range` offset match + declared total length + exact chunk length |
| File validity | `%PDF-` signature, `%%EOF`, exact byte size, and a real PDF parser page count |
| Stable identity | SHA-256 recorded in `content/source-manifest.json` and `*.download.json` |
| Provenance label | `transportSecurity: "unencrypted"` on every record; no UI claim of authentication |
| Local processing | OCR and rendering stay on this machine; no page is uploaded anywhere |
| Re-test | TLS to the portal is re-tested at the start of every production batch; if a valid certificate appears, HTTPS replaces HTTP immediately |

## 5. Consequence for publication

Every lesson produced from these files inherits the limitation. Lesson text is
original prose written from the textbook's concepts, with page locators; it is
not a copy of the textbook. The limitation is disclosed in
`docs/SOURCE-MANIFEST.md`, `docs/CONTENT-QA-REPORT.md` and
`docs/PHASE-03-DELIVERY.md`.

If a rights or distribution question arises later, this exception does not answer
it. It only permits local acquisition and source-grounded lesson writing.
