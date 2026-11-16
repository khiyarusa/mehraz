# MEHRAZ — Phase 02 Integration Guide

How to turn the phase 01 foundation into a content product **without rebuilding
the architecture**.

Audience: the phase 02 agent or developer. Read `ARCHITECTURE.md` and
`DATA-SCHEMA.md` first.

---

## 0. Invariants you must not break

1. `start.html` remains a single, self-contained file that opens from `file://`.
2. No external requests of any kind. No CDN, no remote images, no analytics.
3. Persian-first, RTL, Jalali dates, Persian digits.
4. Student data stays local; no accounts, no sync, no telemetry.
5. Every educational claim is traceable to a named source and locator.
6. Existing route names, state shape and backup format stay compatible. If a
   change is unavoidable, bump `MEHRAZ.schemaVersion`, add a migration, and keep
   old backups importable.
7. The build gate in `build/build.ps1` must keep passing (it rejects external
   references and network APIs).

---

## 1. Acquiring and validating textbooks

### 1.1 Source policy

- Use the **officially published** textbook editions for the target academic year
  (in Iran: the Ministry of Education's textbook portal and its official PDFs).
- Record, for every book: publisher, exact title, academic year, edition/print,
  volume, and where the file came from, in the book's `source` object.
- Respect the terms under which the file is published. Do **not** redistribute the
  PDF itself inside `start.html`, and do not embed page scans as lesson images
  unless the licence clearly allows it. Prefer redrawn diagrams and your own
  wording.
- Never invent a page number, an ISBN, or a publisher. If a locator is unknown,
  leave `pages` empty and mark `verification.status: "draft"`.

### 1.2 Extraction workflow

```
1. Download the official PDF for one grade / track / subject / volume.
2. Record the fingerprint: file name, byte size, SHA-256, edition, download date.
3. Extract the table of contents and paginate it against the PDF's printed page
   numbers (not the PDF page index).
4. Build the chapter skeleton: chapter id, order, title, pageFrom, pageTo.
5. Slice each chapter into lessons using the textbook's own section headings.
6. For every lesson, record pageFrom/pageTo and the learning objectives the
   textbook states (do not invent objectives the book does not support).
7. Cross-check: sum of lesson pages == chapter pages (report discrepancies).
8. Store the extraction notes next to the catalogue (not inside the HTML).
```

Page reconciliation matters: printed page ≠ PDF page. Keep a per-book offset and
verify it at the first and last chapter before trusting it.

### 1.3 Book metadata template

```json
{
  "id": "g10-math-physics-1405-v1",
  "title": "ریاضی ۱ — پایهٔ دهم",
  "grade": 10,
  "track": "math",
  "subject": { "id": "math", "title": "ریاضی" },
  "academicYear": "1405-1406",
  "edition": "1405-print-1",
  "volume": 1,
  "source": {
    "kind": "textbook",
    "publisher": "سازمان پژوهش و برنامه‌ریزی آموزشی",
    "title": "ریاضی ۱",
    "academicYear": "1405-1406",
    "edition": "1405-print-1",
    "reference": "کتاب درسی رسمی",
    "verifiedAt": "2026-11-15T00:00:00.000Z",
    "verifiedBy": "content-team"
  },
  "verification": { "status": "verified", "checkedAt": "…", "checkedBy": "…" },
  "chapters": []
}
```

`id` convention: `<grade>-<subject>-<year>-v<edition>` for books,
`<bookId>-ch<nn>` for chapters, `<bookId>-ch<nn>-ls<nn>` for lessons,
`<bookId>-ch<nn>-q<nn>` for questions. Lowercase ASCII, digits, and hyphens only
(the validator enforces `^[a-z0-9][a-z0-9._-]{2,63}$`).

---

## 2. Writing a lesson

A lesson is a set of ten sections. All are optional, but the reader always shows
all ten, so an empty one is a visible gap — fill them in this order of priority:
`explanation` → `objectives` → `examples` → `keyConcepts` → `summary` →
`exercises` → `intro` → `illustrations` → `interactive` → `references`.

### 2.1 Shape

```jsonc
{
  "id": "g10-math-physics-1405-v1-ch01-ls01",
  "order": 1,
  "title": "<عنوان درس از خود کتاب>",
  "minutes": 14,
  "pageFrom": 4,
  "pageTo": 9,
  "objectives": [
    { "id": "obj-1", "text": "<هدف یادگیری مطابق کتاب>", "bloom": "understand" }
  ],
  "sections": {
    "intro":       { "blocks": [ { "type": "p", "text": "…" } ] },
    "objectives":  { "blocks": [ { "type": "list", "items": ["…", "…"] } ] },
    "explanation": { "blocks": [ { "type": "p", "text": "…" },
                                 { "type": "figure", "src": "data:image/svg+xml;base64,…",
                                   "alt": "…", "caption": "…" },
                                 { "type": "note", "tone": "info", "text": "…" } ],
                     "source": { "kind": "textbook", "reference": "صفحهٔ ۵" } },
    "keyConcepts": { "blocks": [ { "type": "list", "items": ["…"] } ] },
    "examples":    { "blocks": [ { "type": "p", "text": "…" },
                                 { "type": "table", "head": ["…"], "rows": [["…"]] } ] },
    "illustrations": { "blocks": [ { "type": "figure", "src": "data:image/svg+xml;base64,…" } ] },
    "interactive": { "blocks": [ { "type": "note", "text": "…" } ] },
    "exercises":   { "blocks": [ { "type": "list", "items": ["…"] } ] },
    "summary":     { "blocks": [ { "type": "p", "text": "…" } ] },
    "references":  { "blocks": [ { "type": "p", "text": "کتاب درسی، صفحهٔ ۹" } ],
                     "source": { "kind": "textbook", "reference": "صفحهٔ ۹" } }
  },
  "activities": [],
  "questions": [],
  "animation": { "kind": "svg", "preset": "axis-shift", "caption": "…" },
  "verification": { "status": "reviewed", "checkedAt": "…", "checkedBy": "…" },
  "source": { "kind": "textbook", "reference": "صفحهٔ ۴ تا ۹" }
}
```

> The text above is **structure only**. Phase 02 replaces every ellipsis with
> verified content from the official book, with the page locator filled in.

### 2.2 Block types the renderer supports today

| `type` | Fields | Notes |
| --- | --- | --- |
| `p` | `text` | one paragraph; keep paragraphs short for mobile |
| `list` | `items[]` | bulleted; use for objectives, steps, key points |
| `note` | `text`, `tone` (`info`/`warn`) | callout, max two per lesson |
| `figure` | `src` (data URI), `alt`, `caption` | `src` must be `data:image/*`; remote URLs are blocked by the renderer *and* by CSP |
| `table` | `head[]`, `rows[][]` | horizontal scroll on mobile; keep ≤ 5 columns |

Adding a new block type = one branch in `renderBlock()` (`learning.js`) plus
matching CSS. Do this only when a real pedagogical need cannot be expressed with
the five above.

### 2.3 Writing rules

- Short sentences. Line length is capped by the layout; do not fight it with
  manual line breaks.
- Persian digits and punctuation (، ٫ ٪). Wrap Latin/technical fragments in
  `dir="ltr"` only inside HTML; in JSON keep the characters and let the renderer
  decide.
- Never state a fact the source does not state. Where the book is silent, say so
  or omit.
- Formulas: phase 01 has no math renderer. Either typeset them as inline SVG
  (vector, no font dependency) or extend `renderBlock` with a `formula` type in
  phase 02 — then document it here.
- Figures: SVG preferred. Keep each figure under ~40 KB. Compress raster to WebP
  and inline as a data URI only if small.

---

## 3. Interactive activities, games and experiments

`activity` objects are declarative; the code that makes them interactive is a
component you register in the shell.

```jsonc
{
  "id": "act-ch01-01",
  "kind": "simulation",          // simulation | game | experiment | widget
  "title": "…",
  "instructions": "…",
  "embed": "canvas",             // css | svg | canvas | dom
  "component": "slope-lab",      // key in the bundled component registry
  "config": { "…": "…" },
  "source": { "kind": "textbook", "reference": "صفحهٔ ۷" }
}
```

Rules:

- The component must be implemented with the browser's own APIs (canvas, SVG,
  DOM, CSS). No physics engine, no 3D library, no remote runtime.
- It must work with touch **and** keyboard; every draggable needs a keyboard
  alternative (arrow keys) and an accessible text description of the current
  state.
- It must respect `prefers-reduced-motion`: offer a static first frame and a
  "play" control instead of autoplay.
- It must be lazy: build the DOM only when its section scrolls into view, and
  pause when off-screen.
- Games carry a **learning objective**, not just points. State the objective in
  `instructions`, and never make the game the only way to learn a concept.
- Experiments must be safe, offline, and expressed with household materials or
  pure simulation; no real-world hazard instructions.

Where to register: a new file `src/scripts/activities.js` loaded before `app.js`,
exposing `MEHRAZ.activities['slope-lab'] = { mount(el, config) {…}, destroy() }`.
Then `renderBlock`/`renderSection` calls it for `interactive` sections that
reference a component key.

---

## 4. Examinations

Add exams at book level (`book.exams`) for end-of-book tests and at chapter level
(`chapter.exams`) for chapter tests.

```jsonc
{
  "id": "g10-math-physics-1405-v1-ch01-ex01",
  "title": "آزمون فصل ۱",
  "durationMinutes": null,
  "questions": [
    { "id": "…-q01", "type": "mcq", "prompt": "…",
      "options": ["…", "…", "…", "…"], "correct": [1],
      "explanation": "…", "topicId": "…-t02", "topic": "…",
      "difficulty": "medium", "points": 1,
      "source": { "kind": "textbook", "reference": "صفحهٔ ۸" } },
    { "id": "…-q02", "type": "truefalse", "prompt": "…", "correct": "false", "explanation": "…" },
    { "id": "…-q03", "type": "multi", "prompt": "…", "options": ["…"], "correct": [0, 2] },
    { "id": "…-q04", "type": "numeric", "prompt": "…", "answer": 12, "tolerance": 0.5, "unit": "…" }
  ]
}
```

Quality gates for questions:

- One unambiguous correct answer; distractors must be plausible but wrong for a
  stated reason.
- `explanation` is mandatory — it is what the student sees after submission and
  what feeds the review screen.
- `topicId` groups questions so the weak-topic analysis is meaningful.
- No question may be answerable only from a figure that is not in the lesson.
- Numeric questions: state the unit and the accepted tolerance.
- Do not reuse a question from a paid question bank without permission.

---

## 5. Review scheduling

Phase 01 renders whatever the `review` store contains; it does not invent
schedules. Phase 02 must create items when:

- a lesson is completed (first review), and
- a question is answered incorrectly (topic review).

A minimal, defensible rule set (adapt to the pedagogy you adopt, then document it
here):

```
wrong answer      → due in 1 day, topic-level item
lesson completed  → due in 3 days, lesson-level item
item completed OK → schedule the next interval (e.g. 3 → 7 → 21 days)
item failed again → back to 1 day
```

Implementation: extend `store.addAttempt()` / `store.completeLesson()` to also
call a scheduler that writes `review.items`. Keep every item tied to a stable
`lessonId` or `topicId`; the UI already distinguishes due vs upcoming and counts
them for the dashboard.

---

## 6. Inserting content into `start.html`

1. Put the validated catalogue in `content/catalog.json`.
   For several grades, generate it with a script that concatenates per-book files
   and re-checks ids — but the **output** must be a single JSON document.
2. Run the build:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File build/build.ps1
   ```

3. The build embeds `window.MEHRAZ_CONTENT = <catalog>` before the application
   scripts and refuses to write if the output would contain an external
   reference or a network API.
4. Verify:
   - `content.validate()` passes (invalid catalogue → app shows an empty library
     and records the reasons in diagnostics);
   - every lesson has `source.reference`;
   - the total file size is within budget (`OFFLINE-REQUIREMENTS.md` §5);
   - a cold open at 360 px still has no horizontal overflow.

### Size strategy

| Situation | Action |
| --- | --- |
| File grows past ~600 KB | optimise SVGs (SVGO-style manual trimming), drop redundant figures, shorten prose |
| Several grades at once | split into per-grade standalone builds (`start-g10.html`, …) — do **not** add lazy loading, which needs `fetch` |
| Large images | redraw as SVG or omit; a raster data URI is a last resort |

Never introduce runtime loading of separate JSON files. That would break the
`content://` and `file://` guarantees.

---

## 7. Versioning content

- One edition = one book id suffix (`-v1`, `-v2`). A new edition is a new book,
  not an edit of the old one.
- If a lesson changes materially, give it a new id and keep the old object (marked
  `verification.status: "retired"` if you add that value) so old progress still
  resolves. If a lesson is only re-worded, keep the id.
- Chapter/lesson `order` is explicit — never rely on array position.
- Record `source.edition` and `source.academicYear` on every book, and on any
  lesson whose page numbers could drift.

---

## 8. QA gates before shipping phase 02

| Gate | Pass criterion |
| --- | --- |
| Catalogue validity | `content.validate()` → `ok: true`, zero errors |
| Source traceability | 100 % of lessons have `source.reference`; 0 fabricated locators |
| Answer keys | every question has a verified key and an explanation |
| Offline | 0 resource requests; build gate passes |
| Persistence | create → reload → progress intact (same test as phase 01) |
| Backup | export → clear → import restores exactly the same counters |
| Responsive | no horizontal overflow at 360 / 390 / 768 / 1024 / 1440 |
| Long content | a lesson with 12 sections and 3 figures scrolls cleanly on a 360 px screen |
| Accessibility | keyboard-only run through a lesson and an exam; focus visible everywhere |
| Size | single file ≤ 600 KB (or an approved, documented split) |
| No regression | all phase 01 routes still render; `MEHRAZ.diag.errors` is empty |

---

## 9. What phase 02 must not do

- Do not replace the router, state shape, storage adapter or design tokens.
- Do not add a build step the end user has to run.
- Do not "fix" empty states by shipping placeholder lessons.
- Do not introduce a library that must be loaded from a CDN "just for one
  feature".
- Do not invent statistics, achievements or streaks that are not derived from
  stored data.
- Do not weaken the CSP to make an external asset work.

---

## 10. Checklist for the next agent

```
[ ] read ARCHITECTURE.md, DATA-SCHEMA.md, this file
[ ] confirm the target academic year and the official source for each book
[ ] extract chapter/lesson skeleton with page locators
[ ] author lessons section by section, with source.reference
[ ] author chapter + book exams, with explanations and topicIds
[ ] implement the review scheduler
[ ] (optional) implement interactive components and register them
[ ] validate the catalogue, run the build, run the QA gates
[ ] update docs/QA-REPORT.md with real numbers
[ ] do not touch the phase 01 shell unless a documented defect requires it
```
