# PROMPT 03 delivery status

Generated: 2026-11-17T11:47:41Z

## Done

- Inventory reconciled to **130** records across six grades; grade 12
  restored through the numeric category nodes.
- Source transport audited; the certificate override was removed and HTTPS now
  fails closed. Every file is marked `unencrypted`.
- Download pipeline hardened: HTTP 206 required, `Content-Range` must match the
  local offset, total length is enforced, and the assembled file must open in a
  real PDF parser with a page count.
- Activity registry (`match`, `classify`), lesson exercises, block-level
  source references, and empty-section filtering are implemented and tested.
- Biology pilot: **1** lesson, **1** activity,
  **1** practice questions, **6** exam questions,
  one reconstructed SVG diagram.

## Not done

- 21 of 22 biology subsections.
- Visual page verification, independent answer review, OCR accuracy measurement.
- Formula rendering, simulation/lab components.
- The remaining 129 catalogue books.

## Blockers

1. **Source authentication.** `chap.sch.ir` presents `*.roshd.ir`; strict TLS
   fails. An owner decision is required: accept transport-unverified files with a
   documented exception, or supply a verified copy.
2. **Scale.** Completing 130 books is a multi-week production task; each book needs
   OCR, visual checks, lesson writing and answer review.