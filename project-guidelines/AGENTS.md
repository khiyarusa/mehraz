# AGENTS.md — MEHRAZ project instructions

Persistent instructions for any agent or developer working in this repository.
Read this before touching code. It is binding unless the project owner explicitly
changes it.

---

## 1. Identity

| | |
| --- | --- |
| Product | **MEHRAZ** — مهراز |
| Type | interactive, offline-first educational website for Iranian students |
| Entry point | `start.html` (single self-contained file) |
| Devices | desktop (Chrome/Edge) and Android phones (Chrome) |
| Language | Persian (Farsi), full RTL. Engineering docs in English. |
| Visual identity | minimal white, deep navy `#14243B`, primary blue `#2563EB` |
| Creator | Amin — Telegram `@Mozrd`, Rubika `@angosht0` (shown only on the About page) |

---

## 2. Non-negotiable technical constraints

1. **It stays a website.** No native app, no Electron, no Windows app, no PWA, no
   installer, no `.bat`, no local server, no background process.
2. **`start.html` must open by double-click** and work from `file://`. No terminal
   step for the end user.
3. **Single file.** All CSS, JS, SVG and assets are embedded. The development tree
   in `src/` is not a runtime dependency.
4. **No network at runtime.** No CDN, no Google Fonts, no remote icons, no remote
   images, no analytics, no ads, no external APIs, no auth, no cloud storage.
5. **No ES modules, no `import()`, no `fetch`/`XHR` for local files.** Classic
   scripts only; hash routing (`#/route`) instead of the history API.
6. **No new dependency** unless the owner authorises it, and then it must be
   vendored into the file and licence-compatible.
7. **CSP stays.** `default-src 'none'; script-src 'unsafe-inline'; style-src
   'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; …`
   Do not weaken it to make an asset load.
8. **No continuous animations** off-screen; respect `prefers-reduced-motion` and
   the in-app motion setting.

---

## 3. Persian and RTL rules

- `dir="rtl"` on `<html>`; use logical CSS properties (`margin-inline-start`,
  `inset-inline-end`, `border-inline-end`), never `left/right` for layout.
- Persian digits in the UI (`util.toFa`); accept Latin digits in inputs and
  normalise with `util.toEn`.
- Jalali dates only (`MEHRAZ.jalali`); never `toLocaleDateString` for Persian.
- ZWNJ in compounds (`میشود`, `کتابخانه`), Persian comma `،`, guillemets `«»`.
- No letter-spacing or `text-transform` on Persian text; no fixed heights on text
  containers (clipping is a defect).
- Every user-facing string is natural Persian. No machine-translated tone, no
  English UI text.

---

## 4. UI consistency

- One design-token source: `src/styles/tokens.css`. Components use semantic
  aliases (`--txt`, `--brand`, `--surface`), never raw hex.
- One implementation per component, in `components.css` + `components.js`. Do not
  recreate a button, card, modal or empty state inside a view.
- Spacing from the 4 px scale; radii and shadows from tokens only.
- Every button performs a real action. Never add decorative or dead controls.
- Empty states must explain why the area is empty and what will fill it. Never
  fill them with invented data, sample lessons or fake statistics.
- Numbers shown to the student must be derived from stored records, never
  hard-coded.

---

## 5. Data and privacy

- All student data stays local (IndexedDB → localStorage → memory, probed).
- No account, no password, no email, no analytics identifier, no telemetry.
- No cookie. No external request carrying personal data (there is no request at
  all).
- Never silently delete or overwrite stored data. Guard the "newer schema" case by
  running read-only.
- Validate anything imported before use; escape everything rendered (`util.esc`).
- Never `eval`, never inject user text as HTML, never execute imported content as
  script.

---

## 6. Content sources

- Phase 01 ships **no educational content**: no lessons, no facts, no formulas, no
  exercises, no sample chapters. `content/catalog.json` stays `books: []`.
- Phase 02 content must come from official textbooks for the stated academic year,
  with `source.reference` (page locator) on every lesson and `source.edition` on
  every book.
- Do not invent sources, page numbers, ISBNs or publisher names. Unknown locator →
  leave it empty and mark verification as `draft`.
- Do not redistribute copyrighted PDFs or page scans inside `start.html`; redraw
  diagrams and write original prose.
- A structurally invalid catalogue is rejected as a whole — fix the data, do not
  loosen the validator to make bad data pass.
- The structural demo pack (Settings → ابزار توسعه) is for engine testing only. It
  must stay labelled «نمونهٔ ساختاری» and must contain no subject facts.

---

## 7. Phase boundaries

**Phase 01 (this delivery)** — brand, shell, navigation, responsive layout,
onboarding, profile, persistence, backup/restore, dashboard, library/book/lesson
shells, exam engine, review surface, progress, settings, about, content contract,
docs, QA.

**Phase 02 (next)** — official textbook acquisition and validation, chapter
extraction, source-linked lessons, interactive activities, experiments, games,
exam material, review scheduling rules.

Rules:

- Do not start phase 02 work without the owner's approval.
- Do not invent content to fill phase 01 shells.
- Do not rebuild the architecture in phase 02; extend the documented extension
  points (`PHASE-02-INTEGRATION.md`).
- Do not change the specification unilaterally. If something is impossible, say so
  with evidence and propose an alternative.

---

## 8. Code conventions

- Classic ES5-compatible IIFEs, one per file, attaching to `window.MEHRAZ`.
- No globals other than `MEHRAZ` (and `MEHRAZ_CONTENT`, injected at build time).
- View modules register `M.views.<name>(params, query) → { title, nav, html,
  onMount }`. HTML is built as escaped strings; behaviour is bound in `onMount`.
- State changes go through `M.store.update()` / the documented mutators; never
  mutate `store.state` from a view.
- Every new string that a user can see is Persian and escaped.
- Keep functions small and named; comment *why*, not *what*.
- Files are UTF-8 without BOM except `build/build.ps1`, which keeps a BOM so
  Windows PowerShell 5.1 reads it correctly.

---

## 9. Workflow

```
edit src/**  →  powershell -File build/build.ps1  →  open start.html  →  test
```

- Never edit `start.html` by hand; it is generated.
- The build refuses to write if the output contains external resources, `@import`,
  `fetch(`, `XMLHttpRequest` or a dynamic `import(`. Treat a gate failure as a real
  defect, not as something to bypass.
- After a change, re-run the relevant QA items and update `docs/QA-REPORT.md` with
  real results.

---

## 10. Testing requirements

Before declaring any change done:

1. Open `start.html` from `file://` and check `MEHRAZ.diag.errors` is empty.
2. Walk the touched flow end to end with real clicks (not by calling internals).
3. Persistence: reload and confirm the change survived.
4. Backup: export, clear, import, confirm the record is restored.
5. Responsive: no horizontal overflow at 360 / 390 / 768 / 1024 / 1440.
6. Network: `performance.getEntriesByType('resource')` must stay empty.
7. Keyboard: reach the new control with Tab, activate with Enter/Space, and confirm
   the focus ring is visible.

Report results truthfully as PASS / FAIL / NOT TESTED / BLOCKED. Never claim an
untested device or browser passed. Never claim persistence works without an actual
reload test.

---

## 11. Definition of done

- `start.html` built, opens offline, no console errors.
- All routes render; every guard behaves.
- Empty states honest; numbers derived.
- Persian text proofread, RTL correct, no clipping.
- Docs updated (`ARCHITECTURE`, `DESIGN-SYSTEM`, `DATA-SCHEMA`,
  `OFFLINE-REQUIREMENTS`, `QA-REPORT`, `ANDROID-GUIDE`, `PHASE-02-INTEGRATION`).
- QA report reflects what was actually executed.
