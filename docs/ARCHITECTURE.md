# MEHRAZ — Architecture

PROMPT 01 foundation · PROMPT 02 visual layer · version 1.1.0 · schema 1 · build `2026-11-16`

---

## 1. What this is

MEHRAZ (مهراز) is an offline-first educational website that runs from a single
HTML file. A student double-clicks `start.html`; the browser renders the whole
application. There is no server, no installation step, no build step for the
end user, and no network traffic of any kind.

The application is Persian-first and fully RTL. All student data stays in the
browser on that device.

**PROMPT 01 scope:** brand, shell, navigation, responsive layout, onboarding,
local persistence, backup/restore, dashboard, library/book/lesson shells, exam
engine, review surface, progress surface, settings, creator section, content
contract, documentation.

**Out of scope in PROMPT 01 (and deliberately absent):** textbook content,
lessons, exercises, exam questions, review schedules. The engines exist and are
data-driven; the data arrives in PROMPT 03.

---

## 2. Execution model

| Aspect | Decision |
| --- | --- |
| Entry point | `start.html` at the project root |
| Protocol | `file://` (also works from `http(s)://` if ever hosted) |
| Module system | none — classic scripts in one IIFE each, concatenated at build time |
| Dependencies | zero. No CDN, no font API, no icon package, no framework |
| Assets | inline SVG, CSS gradients, data URIs only |
| Networking | none. CSP `connect-src 'none'`, no `fetch`, no `XMLHttpRequest`, no `import()` |
| Storage | IndexedDB (preferred) → localStorage → in-memory |
| Routing | hash based (`#/dashboard`), because `history.pushState` needs an origin that `file://` does not guarantee |

The distributed artefact is a single file. Development sources live in `src/`
and are combined by `build/build.ps1`; the end user never runs it.

---

## 3. Build pipeline

```
src/shell.html            template: document chrome, CSP, boot splash
src/styles/*.css    ─┐
src/scripts/*.js    ─┼─►  build/build.ps1  ─►  start.html   (+ build/build-report.txt)
content/catalog.json ┘                        (+ build/qa-harness.html, dev only)
```

The build is a deterministic text concatenation:

1. Read `src/shell.html`.
2. Replace `/*MEHRAZ:STYLES*/` with the CSS files in a fixed order:
   `tokens → layout → components → motion → responsive`.
3. Replace `/*MEHRAZ:SCRIPTS*/` with `window.MEHRAZ_CONTENT = <catalog>;` followed
   by the scripts in dependency order:
   `bootstrap → art → jalali → storage → state → content → backup → components →
   router → profile → dashboard → learning → examination → review → settings → app`.
4. Replace `{{BUILD_STAMP}}`.
5. Refuse to write the file if the output contains an external resource reference,
   CSS `@import`, `fetch(`, `XMLHttpRequest` or a dynamic `import(`.
6. Write the file as UTF-8 without BOM, then emit `build/build-report.txt`.

`-WithHarness` additionally writes `build/qa-harness.html`, a development-only
page that mounts the built application inside an `<iframe srcdoc>` so layout can
be measured at arbitrary viewport widths. It is never shipped.

Security note: the build runs with the local user's rights and only reads the
project tree. It installs nothing.

---

## 4. Runtime namespace

Everything lives under one global object, `window.MEHRAZ`:

| Member | Responsibility |
| --- | --- |
| `MEHRAZ.version`, `MEHRAZ.schemaVersion`, `MEHRAZ.build` | identity |
| `MEHRAZ.config` | storage key, DB name, persist delay, toast TTL |
| `MEHRAZ.util` | DOM helpers, escaping, Persian digits, dates, debounce, focus trap |
| `MEHRAZ.diag` | error and note collector (`errors[]`, `notes[]`) |
| `MEHRAZ.bus` | tiny pub/sub (`route:rendered`, …) |
| `MEHRAZ.jalali` | Jalali ↔ Gregorian conversion and validation |
| `MEHRAZ.storage` | capability-detected persistence adapter |
| `MEHRAZ.store` | the single mutable state tree + derived statistics |
| `MEHRAZ.content` | catalogue validation, selectors, section plan, demo pack |
| `MEHRAZ.backup` | export document, validation, restore |
| `MEHRAZ.ui` | components: modal, toast, empty state, progress, charts |
| `MEHRAZ.router` | hash routing, guards, chrome updates |
| `MEHRAZ.views` | one renderer per page |
| `MEHRAZ.app` | boot, chrome construction, global search, import flow, preferences |

No module keeps private state outside its own closure. Views are pure functions
returning `{ title, nav, html, onMount }`.

---

## 5. Boot sequence

```
DOMContentLoaded
  └─ app.boot()
       1. storage.init()      probe IndexedDB → localStorage → memory
       2. store.init()        read, validate, migrate/normalise state
       3. content.init()      validate window.MEHRAZ_CONTENT
       4. app.applyPrefs()    theme + motion attributes
       5. app.buildChrome()   sidebar, bottom nav, storage chip, profile chip
       6. bind search + profile menu
       7. router.start()      render entry route (dashboard if a profile exists)
       8. remove boot splash, emit post-boot notices
```

Failures at each step are caught, recorded in `MEHRAZ.diag`, and degrade
gracefully: unavailable storage → memory mode with a visible warning;
invalid catalogue → empty catalogue (the shell still works).

---

## 6. Routing

Hash routes, matched by exact segment count; `:param` segments are captured and
URL-decoded.

| Route | View | Guard |
| --- | --- | --- |
| `#/welcome` | welcome | guest only |
| `#/onboarding` | onboarding wizard | guest only |
| `#/dashboard` | dashboard | profile required |
| `#/library` | library (`?scope=mine\|all`) | profile required |
| `#/library/:grade` | grade | profile required |
| `#/library/:grade/:track` | grade + track | profile required |
| `#/subject/:subjectId` | subject → book | profile required |
| `#/book/:bookId` | book / chapters | profile required |
| `#/book/:bookId/:chapterId` | same book, chapter expanded | profile required |
| `#/lesson/:bookId/:chapterId/:lessonId` | lesson reader | profile required |
| `#/exam` | exam list + history | profile required |
| `#/exam/:examId` | exam runner | profile required |
| `#/exam/:examId/result/:attemptId` | result + review | profile required |
| `#/review` | review programme | profile required |
| `#/progress` | progress | profile required |
| `#/settings` | settings | profile required |
| `#/profile/edit` | profile wizard (edit mode) | profile required |
| `#/about` | about the creator | public |

Guards redirect rather than error. Unknown routes render a designed 404 page.

`router.render({ path })` can render a route without touching the URL. Boot uses
this so the first paint has no navigation side effect (a fragment-only redirect
would resolve against the container URL inside `srcdoc`/sandboxed hosts).

`router.refresh()` re-renders in place without resetting scroll, used after a
mutation that changes the current page (marking a lesson complete, finishing a
review).

---

## 7. State

`MEHRAZ.store.state` is the only mutable application state. It is a plain object
(see `DATA-SCHEMA.md`), normalised on load, written through `store.update()` and
persisted on a 140 ms debounce. Every write also records an activity entry
(capped at 400) so the dashboard can show real history.

Derived values (progress percentages, averages, due reviews) are computed on
demand — never stored — so they cannot drift from the underlying records.

Re-entrancy: `store.update()` is synchronous; listeners run after persistence.
Views are rebuilt from state on every route change, so there is no partial DOM
state to reconcile.

---

## 8. Storage adapter

`MEHRAZ.storage` probes capabilities instead of assuming them:

1. **IndexedDB** — open `mehraz` v1, store `kv`, write `__probe__`, read it back,
   delete it. 3 s timeout, `SecurityError`/`Blocked` handled.
2. **localStorage** — write/read/remove a probe key.
3. **memory** — last resort; the UI shows a persistent warning and points at the
   backup button.

`status()` exposes `{ driver, ok, probed, testedAt, error, notes, fallbackFrom }`.
Diagnostics are console-only (`MEHRAZ.diag`, `MEHRAZ.storage.recheck()`); no
storage UI is exposed to the student.

Nothing is written until a probe succeeds, so the app never claims persistence it
does not have.

---

## 9. Content engine

The catalogue is embedded at build time as `window.MEHRAZ_CONTENT` and validated
at runtime (`content.validate`). A structurally invalid catalogue is rejected as
a whole, with the reasons recorded in diagnostics — partial content is worse than
none for a study product.

Hierarchy: `book → chapter → lesson → section`, plus `exam → question` at book or
chapter level. Every lesson declares ten ordered sections (`intro`, `objectives`,
`explanation`, `keyConcepts`, `examples`, `illustrations`, `interactive`,
`exercises`, `summary`, `references`). Missing sections render a designed
placeholder, so adding content is additive and needs no UI changes.

Stable identifiers are the contract with progress data: lesson IDs are stored in
`progress.lessons[<lessonId>]`, so a new textbook edition must introduce new IDs
for materially changed lessons rather than overwrite the old ones.

There is no demo pack, sample lesson or developer switch in the student build.
Engine fixtures live only in `build/` (harness, QA pages) and are never embedded
in `start.html`.

---

## 10. Rendering and safety

- All dynamic text passes through `MEHRAZ.util.esc()` (escapes `& < > " '`).
- Lesson blocks support a closed set of types: `p`, `list`, `note`, `figure`,
  `table`. A figure's `src` is accepted only if it is `data:image/*` or `blob:`;
  anything else is replaced with a visible "external image blocked" notice.
- Imported backup JSON is validated field by field before use; nothing is
  `eval`ed, injected as script, or trusted for HTML.
- A Content-Security-Policy meta tag forbids all external loading:
  `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';
  img-src data: blob:; font-src data:; connect-src 'none'; media-src 'none';
  object-src 'none'; base-uri 'none'; form-action 'none'`.
- The only outbound links in the document are the creator's Telegram and Rubika
  pages on the About page. They are user-initiated navigation, not a runtime
  dependency, and carry `rel="noopener noreferrer"`.

---

## 11. Error handling

- Window `error` and `unhandledrejection` are recorded in `MEHRAZ.diag.errors`.
- A view that throws is replaced by a designed error card with a route home; the
  rest of the shell keeps working.
- Persistence failures set `store.storageIssue` and surface a toast with an
  action that opens Settings.
- If stored data is **newer** than this build's schema, the app runs read-only in
  memory, never overwrites the record, and explains the situation in Settings.

---

## 12. Source map

```
start.html                     built artefact — open this
src/shell.html                 document chrome, CSP, boot splash
src/styles/tokens.css          palette, type, space, radius, elevation, motion tokens
src/styles/layout.css          shell grid, sidebar, topbar, content, page scaffolding
src/styles/components.css      every component, light + night themes
src/styles/motion.css          keyframes, page transitions, stagger, reduced motion
src/styles/responsive.css      breakpoints, bottom nav, touch targets, print
src/scripts/bootstrap.js       namespace, utils, Persian digits, icons, brand
src/scripts/art.js             generated SVG art: orbit, monograms, rings, area charts, empty states
src/scripts/jalali.js          Jalali conversion, leap years, month lengths, age
src/scripts/storage.js         IndexedDB → localStorage → memory adapter
src/scripts/state.js           state tree, normalisation, mutations, statistics
src/scripts/content.js         catalogue validation, selectors, demo pack
src/scripts/backup.js          backup document, validation, restore
src/scripts/components.js      UI primitives (modal, toast, progress, charts…)
src/scripts/router.js          hash router, guards, chrome sync
src/scripts/profile.js         welcome, onboarding wizard, profile editing
src/scripts/dashboard.js       student dashboard
src/scripts/learning.js        library, grade, subject, book, lesson reader
src/scripts/examination.js     exam list, runner, result, review of answers
src/scripts/review.js          review programme and progress analytics
src/scripts/settings.js        settings, storage diagnostics, about
src/scripts/app.js             assembly: boot, chrome, search, import flow, routes
build/build.ps1                development build (PowerShell 5.1, no dependencies)
build/harness-template.html    template for the dev-only responsive harness
content/catalog.json           build-time content input (empty in PROMPT 01)
content/content-contract.json  JSON Schema for PROMPT 03 content
docs/                          engineering documentation
project-guidelines/AGENTS.md   persistent project instructions
```

---

## 13. Extension points reserved for PROMPT 03

| Extension point | Where |
| --- | --- |
| Add books/lessons | `content/catalog.json` → rebuild |
| Add question types | `examination.js` (`normalizeAnswer`, `isCorrect`, renderers) |
| Add lesson block types | `learning.js` (`renderBlock`) |
| Add interactive activities | `MEHRAZ.activities[<component>]` renderer + contract key |
| Add review scheduling rules | `store.reviewItems` producers; the UI already renders due/upcoming |
| Add a page | `M.views.<name>` + one `router.add()` entry |
| Change theme tokens | `tokens.css` only |

Nothing above requires touching the shell, the router, or the storage layer.
