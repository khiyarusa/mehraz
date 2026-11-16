# Build instructions (development only)

The end user never runs anything from this folder. `start.html` at the project
root is already built (content is not included; see `docs/CONTENT-PIPELINE.md`).
This document is for whoever changes `src/`.

---

## Requirements

- Windows PowerShell 5.1 (built into Windows 10/11). No Node, no npm, no Python,
  no internet, nothing to install.
- Read/write access to the project folder.

`build/build.ps1` uses only `Get-Item`, `Join-Path`, `ConvertFrom-Json` and
`System.IO` — no modules, no external binaries.

---

## Build

From the project root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File build/build.ps1
```

Output:

```
start.html                   the distributable single file
build/build-report.txt      size, line count, script/style counts, gate results
```

Add `-WithHarness` to also produce the development-only responsive harness:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File build/build.ps1 -WithHarness
```

`build/qa-harness.html` mounts the built document in an `<iframe srcdoc>` so layout
can be measured at fixed widths (360…1440). It is never distributed. The harness
exposes `MZ_QA.audit(widths, path)` and `MZ_QA.measure()` in the page console.

---

## What the build does

1. Reads `src/shell.html`.
2. Replaces `/*MEHRAZ:STYLES*/` with, in order:
   `tokens.css`, `layout.css`, `components.css`, `motion.css`, `responsive.css`.
3. Replaces `/*MEHRAZ:SCRIPTS*/` with `window.MEHRAZ_CONTENT = <catalog>;` followed
   by, in order:
   `bootstrap`, `art`, `jalali`, `storage`, `state`, `content`, `backup`, `components`,
   `router`, `profile`, `dashboard`, `learning`, `examination`, `review`,
   `settings`, `app`.
4. Replaces `{{BUILD_STAMP}}` with the current date/time.
5. **Gates** — aborts without writing if the output contains:
   - an external resource reference (`<script src="http…">`, `<link href="http…">`,
     `<img src="http…">`, `url(http…)`),
   - CSS `@import`,
   - `fetch(`, `XMLHttpRequest`, or a dynamic `import(`.

   Plain anchors to the creator's contact pages are allowed (user-initiated
   navigation, not a runtime dependency).
6. Writes `start.html` as UTF-8 **without BOM** and emits the report.

Deterministic: the same sources produce the same file apart from the build stamp.

---

## Adding or changing files

| Task | Steps |
| --- | --- |
| Add a style file | create `src/styles/<name>.css`, add `<name>` to `$styleFiles` in `build.ps1` (order matters: tokens first, responsive last) |
| Add a script | create `src/scripts/<name>.js`, add `<name>` to `$scriptFiles` **before** the modules that use it (`app.js` must stay last) |
| Add a page | create the view in the right module, register it with `M.router.add()` in `app.js` |
| Change the shell | edit `src/shell.html`; keep `/*MEHRAZ:STYLES*/` and `/*MEHRAZ:SCRIPTS*/` placeholders and the CSP meta |
| Change content | edit `content/catalog.json` only, then rebuild |

Never edit `start.html` directly — the next build overwrites it.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Missing source file: …` | a name in `$styleFiles` / `$scriptFiles` has no file | create it or remove it from the list |
| `Style placeholder missing` / `Script placeholder missing` | `src/shell.html` lost a placeholder comment | restore `/*MEHRAZ:STYLES*/` / `/*MEHRAZ:SCRIPTS*/` |
| `External resource reference detected` | an `http(s)` URL on a resource element | inline the asset (data URI) or remove it |
| `Network-capable API detected` | a `fetch(`, `XMLHttpRequest` or dynamic `import(` appeared | remove it; the product must not call the network |
| Build output shows `Ã¢â‚¬â€` style mojibake in the console | `build.ps1` lost its UTF-8 BOM and PowerShell 5.1 read it as ANSI | re-save `build.ps1` as UTF-8 **with** BOM |
| Blank page after editing | a JavaScript syntax error | open DevTools console; the build does not parse JS |

---

## Post-build checklist

```
[ ] start.html opens from file:// with no console error
[ ] MEHRAZ.diag.errors is empty after walking the main flow
[ ] reload keeps the profile and progress
[ ] export → clear → import restores the record
[ ] no horizontal overflow at 360 / 390 / 768 / 1024 / 1440
[ ] performance.getEntriesByType('resource') is empty
[ ] file size still within the budget (docs/OFFLINE-REQUIREMENTS.md §5)
[ ] docs/QA-REPORT.md updated with what you actually ran
```
