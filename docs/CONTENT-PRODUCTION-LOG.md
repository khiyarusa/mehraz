# Content production log

Append-only checkpoints. Times are UTC.

| When | Step | Evidence |
|---|---|---|
| 2026-11-16 | Inventory rebuilt for grades 7-12 (130 records) | `content/inventory.json` |
| 2026-11-16 | Local OCR installed and verified (Tesseract 5.4, fas) | `docs/PILOT-01-BIOLOGY.md` |
| 2026-11-16 | Biology pilot: 1 lesson + 6-question exam | `content/catalog.json` |
| 2026-11-17 | TLS bypass removed; HTTPS acquisition fails closed | `tools/net.ps1` |
| 2026-11-17 | Downloader verifies 206, Content-Range, PDF structure, page count | `tools/fetch-source-pdf.ps1` |
| 2026-11-17 | Activity engine (match) + lesson exercises + section filtering | `src/scripts/activities.js` |
| 2026-11-17 | Status reports generated from artefacts | `content/status.json` |
| 2026-11-17 | Grade-10 pipeline: verified downloads + TOC OCR for all 27 books | `content/grade10/sources.json` |
| 2026-11-18 | Biology chapter 1 complete: 3 lessons, 5 activities, 32 questions | `content/lessons` |

Next checkpoint: complete chapter 1 (three subsections) with visual checks.