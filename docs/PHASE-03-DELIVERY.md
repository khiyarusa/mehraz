# PROMPT 03 delivery status

Generated: 2026-11-18T17:59:10Z

## Done

- Inventory reconciled to **148** records across six grades; grade 12
  restored through the numeric category nodes.
- Grade-10 sources: **27 / 27** official PDFs
  downloaded and structurally verified, **3724** pages, OCR of the first pages in
  **27** books (**214** pages), TOC candidates for
  **22** books.
- Source transport audited; the certificate override was removed and HTTPS now
  fails closed. Every file is marked `unencrypted`.
- Download pipeline hardened: HTTP 206 required, `Content-Range` must match the
  local offset, total length is enforced, and the assembled file must open in a
  real PDF parser with a page count.
- Activity registry (`match`, `classify`), lesson exercises, block-level
  source references, and empty-section filtering are implemented and tested.
- Biology pilot: **4** lesson, **1** activity,
  **1** practice questions, **23** exam questions,
  one reconstructed SVG diagram.

## Not done

- 21 of 22 biology subsections.
- Visual page verification, independent answer review, OCR accuracy measurement.
- Formula rendering, simulation/lab components.
- The remaining 147 catalogue books.

## Blockers

1. **Source transport.** `chap.sch.ir` presents `*.roshd.ir`; strict TLS fails.
   The owner approved a documented HTTP exception on 2026-11-17
   (`docs/SOURCE-TRANSPORT-EXCEPTION.md`). Files remain transport-unverified and
   TLS is re-tested at every batch.
2. **Scale.** Completing 130 books is a multi-week production task; each book needs
   OCR, visual checks, lesson writing and answer review.