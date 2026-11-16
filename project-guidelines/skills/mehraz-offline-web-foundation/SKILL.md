---
name: mehraz-offline-web-foundation
description: Build or extend the MEHRAZ single-file offline Persian (RTL) education website. Use when working in this project on the standalone start.html, the design system, local persistence, or phase-02 content integration. Covers the file:// constraints, the PowerShell build, the content contract and the QA gates.
---

# MEHRAZ offline web foundation

A reusable procedure for working on **MEHRAZ** (مهراز): a Persian, RTL,
offline-first educational website distributed as one `start.html` file.

## When to use this skill

- Adding or changing a page, component or style in this project.
- Integrating textbook content (phase 02).
- Debugging "works on my server but not when I double-click the file".
- Reviewing a change for offline, RTL, accessibility or privacy regressions.

## Hard constraints (violating any of these is a defect)

1. One distributable file: `start.html`. Everything inline. No sibling assets at
   runtime.
2. Runs from `file://` by double-click. No server, no install, no launcher, no
   service worker, no PWA.
3. Zero network: no CDN, fonts, icons, images, analytics, APIs. The build refuses
   to write if `fetch(`, `XMLHttpRequest`, dynamic `import(`, `@import` or an
   external resource reference appears.
4. Classic scripts only; hash routing (`#/route`), not the history API.
5. Persian-first and fully RTL with logical CSS properties, Persian digits, Jalali
   dates, ZWNJ in compounds.
6. Student data is local only: IndexedDB → localStorage → memory, chosen by a real
   write/read probe. Never assume persistence; always offer backup.
7. No invented educational content, statistics or sources. Empty states explain
   themselves instead of showing fake data.

## Architecture at a glance

```
window.MEHRAZ
  util        DOM, escaping, Persian digits, focus trap
  jalali      Jalali <-> Gregorian, month lengths, leap years
  storage     probe chain, status(), recheck()
  store       single state tree, update(), derived stats, flush()
  content     catalogue validation + selectors + section plan + demo pack
  backup      export document, parse/validate, apply
  ui          modal, toast, empty, progress, donut, charts
  router      hash routes, guards, chrome sync, render({path})
  views       welcome, onboarding, dashboard, library/grade/subject/book/lesson,
              examList/examRun/examResult, review, progress, settings, about
  app         boot, chrome, search, import flow, preferences, routes
```

State shape and backup format are normative in `docs/DATA-SCHEMA.md`; the content
contract is `content/content-contract.json`.

## Build

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File build/build.ps1            # start.html
powershell -NoProfile -ExecutionPolicy Bypass -File build/build.ps1 -WithHarness
```

- Never hand-edit `start.html`.
- `src/shell.html` holds `/*MEHRAZ:STYLES*/` and `/*MEHRAZ:SCRIPTS*/` placeholders.
- Script order ends with `app.js`; style order is tokens → layout → components →
  motion → responsive.
- `build.ps1` must keep its UTF-8 **BOM**, otherwise PowerShell 5.1 misreads it.

## Adding a page

```js
// src/scripts/thing.js
(function (window) {
  'use strict';
  var M = window.MEHRAZ, util = M.util, esc = util.esc;
  M.views = M.views || {};
  M.views.thing = function (params, query) {
    return {
      title: 'عنوان', nav: 'library', html: '<div class="page">…</div>',
      onMount: function (root) { /* bind events here */ }
    };
  };
})(window);
```

Then one line in `app.js`:

```js
add({ path: '#/thing', title: 'عنوان', nav: 'library', requiresProfile: true, view: M.views.thing });
```

## Adding content (phase 02)

1. Extract the chapter/lesson skeleton from the official textbook; record page
   locators.
2. Author `sections` (`intro … references`) with blocks of type `p`, `list`,
   `note`, `figure`, `table`. Figures must be `data:image/*`.
3. Add exams with `explanation` and `topicId` on every question.
4. Put the catalogue in `content/catalog.json`, rebuild, and run the gates.
5. Ids are the join key with progress: new edition ⇒ new ids.

Details: `docs/PHASE-02-INTEGRATION.md`.

## Verification loop (do not skip)

1. Open `start.html` from `file://`; `MEHRAZ.diag.errors` must be empty.
2. Walk the touched flow with real clicks.
3. Reload → the change must survive.
4. Export → clear → import → the record must be restored.
5. No horizontal overflow at 360/390/768/1024/1440.
6. `performance.getEntriesByType('resource')` must be `[]`.

## Traps specific to this codebase

- `[hidden]` is overridden by component `display` rules — the global
  `[hidden] { display: none !important }` exists for that reason; keep it.
- Never `location.replace('#/route')` on boot: fragment-only navigation resolves
  against the container URL inside `srcdoc`/sandboxed hosts. Use
  `router.render({ path })`.
- Modals must close on Escape at document level; a panel-level handler misses the
  key when focus has moved.
- Decorative progress bars inside links need `aria-hidden` plus a screen-reader
  percentage, or they pollute the link's accessible name.
- `store.init()` resets `futureData`; do not remove that line or one future-version
  encounter blocks every later write.
- Jalali day lists must be rebuilt when month/year changes, and impossible days
  must never be assignable.
- Every escape: `util.esc()` on any interpolated string, no exceptions.

## Exit criteria for any change

- `start.html` rebuilt, opens offline, no console errors, all routes render.
- Persian copy proofread; RTL correct; no clipping; contrast preserved.
- `docs/QA-REPORT.md` updated with what was actually executed (PASS / FAIL /
  NOT TESTED / BLOCKED — never inflate).
