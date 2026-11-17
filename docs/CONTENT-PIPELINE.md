# MEHRAZ — Content pipeline and source audit

Status: **historical audit trail; superseded on 2026-11-17 for counts and tooling.**
Canonical sources now: `content/status.json`, `docs/CONTENT-INVENTORY.md`,
`docs/SOURCE-MANIFEST.md`, `docs/CURRICULUM-COVERAGE.md`. Corrections recorded
here: 130 records (not 103), grade 12 restored through numeric category nodes,
local Persian OCR is installed and working, and source transport is HTTP-only and
unauthenticated.
Date: 2026-11-16 · target academic year on the portal: **1405–1406**.

This document records what was actually verified against the official textbook
portal (`chap.sch.ir`), what was built to automate it, and the exact reason no
lesson text exists in the repository yet.

---

## 1. Summary

| Question | Answer |
| --- | --- |
| Is the official portal reachable? | Yes, over **plain HTTP**. Its HTTPS virtual host is broken (see §2). |
| Are the official PDFs downloadable? | Yes. 103 book records resolved to a live `…/lbooks/1405-1406/…/C<code>.pdf` URL. |
| Do the PDFs contain extractable text? | **No.** Every inspected file is a page-image scan with zero embedded fonts. |
| Can we OCR them here? | **No.** No tesseract, and the bundled Python and Node runtimes do not execute in this environment. |
| Are lessons written? | **No** — and they must not be, until the text is extracted from the controlling source. |

The project rule from PROMPT 03 is explicit: the official textbook is the only
permitted source, and model memory must not substitute for it. Writing lessons
from general knowledge and labelling them with page references would be
fabrication. That is why this phase stops at the source layer.

---

## 2. Portal access — what actually works

The site presents a certificate issued for `*.roshd.ir` while serving
`chap.sch.ir`, so Windows rejects the TLS chain. More importantly, **the HTTPS
vhost serves a 1-byte stub** for every path, while plain HTTP serves the real
Drupal application:

| Request | Result |
| --- | --- |
| `GET https://chap.sch.ir/` | `200`, `content-length: 1` (stub) |
| `GET https://chap.sch.ir/books/14199` | `200`, 1 byte (stub) |
| `GET http://chap.sch.ir/` | `200`, 262 KB real catalogue |
| `GET http://chap.sch.ir/books/14199` | `200`, 175 KB book page with a PDF link |

Tooling therefore speaks **HTTP** (`tools/net.ps1`, `tools/build-inventory.ps1`).
The PDF link pattern is:

```
http://chap.sch.ir/sites/default/files/lbooks/<academic-year>/<volume-dir>/C<book-code>.pdf
```

Example: `…/lbooks/1405-1406/555/C705.pdf` (ریاضی هفتم).

---

## 3. What the portal's catalogue gave us

`tools/build-inventory.ps1` walks the category pages, reads every book card
(title, official book code, book-page id, cover year) and then resolves the PDF
URL from each book page. Output: `content/inventory.json` (130 books; rebuilt
2026-11-17 after the grade-12 fix).

| Grade | Books resolved | Confidence |
| --- | --- | --- |
| 7 | 16 | **verified** |
| 8 | 16 | **verified** |
| 9 | 16 | **verified** |
| 10 | 26 | **verified** — every listing heading matches its target grade |
| 11 | 28 | **verified** — after the year-term correction |
| 12 | 28 | **verified** — numeric category nodes 711 / 712 / 709 |

Notes on the portal's taxonomy, recorded because they will waste someone's day
otherwise:

- Numeric category URLs (`/category/دوره/646`) can resolve to **special-education**
  trees that reuse the same grade names. Always read the page `<h1>` and the book
  titles before trusting a listing.
- The نظری year terms are labelled one grade off: `سال-دوم` renders "پایه دهم",
  `سال-سوم` renders "پایه یازدهم", and `سال-اول` renders an empty
  "کتاب های ورودی بی اعتبار" page.
- Grade 12 is reachable only through the numeric category nodes the main menu
  links to (711 mathematics, 712 experimental, 709 humanities); the year-term
  slugs stop at grade 11. This was fixed on 2026-11-17.

`content/inventory.json` stores `gradeFromCatalogue` and `gradeConfidence`
(`verified` / `taxonomy-mismatch` / `unknown`) per book so the uncertainty is
visible rather than hidden.

---

## 4. The decisive finding: the PDFs are scans

`tools/inspect-pdf.ps1` classifies a file by looking for embedded fonts,
`ToUnicode` maps and image objects.

| File | Size | Fonts | ToUnicode | Images | Verdict |
| --- | --- | --- | --- | --- | --- |
| `آموزش قرآن (هفتم)` C701 | 5.05 MB | 0 | 0 | 154 | **scan** |
| `ریاضی (هفتم)` C705 | 35.9 MB | 0 | 0 | 190 (135 pages) | **scan** |

Fingerprints and full details: `content/source-manifest.json`.

A scan has no text layer, so no amount of parsing will produce the book's words.
Persian OCR is required, and it is not available here:

| Route | Status |
| --- | --- |
| `pdftotext` / `mutool` / `qpdf` | not installed |
| Tesseract | not installed |
| Python (`pytesseract`, `pdfplumber`) | runtime hangs — unusable |
| Node + bundled `autoclaw-pdf-ocr` skill | `node` hangs; the skill's doctor check times out |
| Windows built-in OCR | not attempted; Persian language pack availability unverified and the API is impractical over 15 000 pages |

Consequence: **the acquisition half of PROMPT 03 is solved; the extraction half is
blocked by tooling, not by policy.**

---

## 5. What is committed vs. what is not

| Artefact | Committed | Why |
| --- | --- | --- |
| `tools/net.ps1` | yes | reproducible HTTP/TLS handling for the portal |
| `tools/build-inventory.ps1` | yes | regenerates the inventory |
| `tools/inspect-pdf.ps1` | yes | proves the scan finding, per file |
| `content/inventory.json` | yes | the source inventory (metadata only) |
| `content/source-manifest.json` | yes | fingerprints + scan verdicts |
| The PDF files themselves | **no** | copyrighted source material, not redistributable; `.tmp/` is git-ignored |
| Extracted textbook text | none yet | blocked on OCR |
| Lessons / exercises / exams | none | must be derived from the source, not invented |

---

## 6. How to resume

### If OCR becomes available (recommended path)

```powershell
# 1. re-confirm the catalogue (cheap, cached)
powershell -File tools\build-inventory.ps1

# 2. download one book for a pilot
#    (url is in content/inventory.json; save under .tmp/books/)
# 3. render + OCR it with the bundled skill, once `node` works:
node "<skill-dir>\scripts\pdf-ocr.mjs" run --pdf ".tmp/books/C705.pdf" --pages "1-20" --json

# 4. check completeness before using any text
#    manifest.json → complete === true, failedPages === []
```

Then: build the chapter map from the printed table of contents, verify the
printed↔PDF page offset at both ends of the book, and only then author lessons.

### If OCR cannot be provided

The only honest options are:

1. Run the pipeline on a machine that has a working OCR toolchain (the scripts
   and inventory are portable), then bring the extracted text back.
2. Supply the books' text (or a licensed digital edition) so the lessons can be
   grounded.
3. Narrow the release to subjects where a text-bearing source is legitimately
   available.

### What must **not** happen

Authoring lessons from prior knowledge and attaching page citations to them. The
product's whole claim is that every fact traces to the official book; a fabricated
locator would poison that claim silently, and no later QA pass would catch it.

---

## 7. Coverage matrix (current)

```
year 1405-1406
├── grade 7   ████████████████ 16/16 books located   (text: blocked)
├── grade 8   ████████████████ 16/16 books located   (text: blocked)
├── grade 9   ████████████████ 16/16 books located   (text: blocked)
├── grade 10  ████████████░░░░ 26 books located      (track completeness unconfirmed)
├── grade 11  ███████████░░░░░ 29 books located      (track completeness unconfirmed)
└── grade 12  ░░░░░░░░░░░░░░░░ 0 books located       (portal term not found)
```

Per-book lesson status: `blocked-needs-ocr` for all — nothing is marked complete
and nothing is presented to students as finished content.
