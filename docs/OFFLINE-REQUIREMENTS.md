# MEHRAZ — Offline Requirements

The product requirement is absolute: **the site must work with the network cable
pulled out, from a local file, with no installation.**

---

## 1. Hard rules

| Rule | Status in PROMPT 01 |
| --- | --- |
| Single entry file `start.html` | yes — 343.4 KB, self-contained |
| No external CSS / JS / images / fonts | yes — all inlined |
| No CDN, no Google Fonts, no icon package | yes |
| No `fetch`, `XMLHttpRequest`, `import()` | yes — build fails if any appears |
| No analytics, ads, pixels, beacons | yes |
| No service worker, no PWA manifest, no install prompt | yes (service workers are unavailable on `file://` anyway) |
| No local server, no localhost, no background process | yes |
| No installer, no `.bat`, no launcher | yes |
| All data local | yes — IndexedDB / localStorage, never transmitted |
| Runs from `file://` | yes — verified in Chrome on `file:///…/start.html` |

---

## 2. Content-Security-Policy

`start.html` sets CSP through a `<meta http-equiv>` tag (a header is impossible
on `file://`):

```
default-src 'none';
script-src 'unsafe-inline';
style-src 'unsafe-inline';
img-src data: blob:;
font-src data:;
connect-src 'none';
media-src 'none';
object-src 'none';
base-uri 'none';
form-action 'none'
```

Consequences, by design:

- A stray `fetch()` to any origin is blocked by `connect-src 'none'`.
- A stray `<img src="https://…">` is blocked by `img-src`.
- A stray `<script src="…">` is blocked by `default-src 'none'`.
- `'unsafe-inline'` is required because the entire application is inline; that is
  the correct trade-off for a file-distributed document, and it is paired with
  strict output escaping (see `ARCHITECTURE.md` §10).

The only outbound links are the creator's Telegram/Rubika pages on the About
page. They are ordinary anchors, opened only when the student chooses to, and are
not needed for any feature.

---

## 3. How offline behaviour was verified

1. `build/build.ps1` refuses to write `start.html` if the output contains
   `src="http…"`, `href="http…"` on a resource element, `url(http…)`, `@import`,
   `fetch(`, `XMLHttpRequest`, or a dynamic `import(`.
2. In the running page,
   `performance.getEntriesByType('resource')` returned **an empty array** — the
   document issues zero sub-resource requests. Navigation type `navigate`,
   transfer from disk, DOMContentLoaded 149 ms, load 151 ms (Chrome 148, this
   build, 2026-11-16).
3. DevTools → Network with the cache disabled shows a single request: the
   document itself.
4. The application was exercised with a full flow (onboarding → lesson → exam →
   result → progress → backup export → clear → restore) without any network
   access being required at any point.
5. No `navigator.onLine` check exists anywhere in the code, because the app is
   expected to be offline by default; there is nothing to degrade.

> Recommended manual check for reviewers: open DevTools → Network → check
> "Offline", then reload `start.html`. Every page, form, exam and backup action
> must behave exactly as before.

---

## 4. `file://` realities

These are browser facts, not application choices. The app is built to survive all
of them.

| Reality | Handling |
| --- | --- |
| `file://` pages have an opaque origin in several engines | No API that needs a secure context is used. No `crypto.subtle`, no `navigator.storage.persist()`, no service worker, no `history.pushState`, no `localStorage` assumption. |
| Storage can be unavailable or throw `SecurityError` | Probe chain IndexedDB → localStorage → memory, each with a real write/read test. Memory mode shows one actionable warning and points at the backup button. |
| Storage is per browser (and often per browser profile) | The interface says backups are the way to move data; it never names the storage layer. |
| Some Android file managers open documents through `content://` URIs | The document depends on **no sibling file**; everything is inline, so the URI has nothing to break. Storage may fall back to memory there — the warning appears immediately. |
| Clearing browser data deletes the record | The UI states this in Settings and offers export at any time. |
| Two tabs of the same file share the record | Last write wins; each tab reads at boot. Not treated as a sync feature. |
| `file://` cannot set HTTP headers | CSP delivered via `<meta>`; no HSTS, no CORS, no cookies needed. |

### Known limitations (documented, not hidden)

- Browser storage is not encrypted at rest; anyone with access to the device
  profile can read it. MEHRAZ is a study tool, not a vault.
- Data does not move between devices except through an exported backup file.
- If a browser profile is in private/incognito mode, the record disappears when
  the last private window closes.
- A browser update, a policy, or an aggressive cleaner can clear the database
  without warning. Periodic backups are the only defence.
- Maximum practical dataset: a single record of a few hundred KB is normal; the
  browser quota (typically tens of MB per origin) is never approached by PROMPT 01
  data.

---

## 5. Size and performance budget

| Budget | Limit | Actual (pre-release build, 2026-11-16) |
| --- | --- | --- |
| Single file | 600 KB | 343.4 KB |
| DOM nodes on dashboard | 700 | 401 |
| JS heap after full flow | 24 MB | ~2–3 MB |
| Cold open (file://) | 400 ms | 149 ms DOMContentLoaded / 151 ms load |
| Sub-resource requests | 0 | 0 |
| CSS animation on hidden nodes | none | none |

PROMPT 03 adds content to the same file. The budget above is the gate: if lesson
content pushes the file past ~600 KB, assets must be reduced (SVG optimised,
figures limited to what is pedagogically necessary) or content must be split into
multiple standalone volumes — a decision that must be documented, not improvised.

---

## 6. Distribution

1. Copy the folder containing `start.html` (or just `start.html`) to the device.
2. Open it with Chrome, Edge, or any modern browser.
3. Nothing else is required — no extraction, no companion folder, no internet.

`src/`, `build/`, `content/` and `docs/` are development material and may be
omitted from the copy; `start.html` alone is the product. See
`ANDROID-GUIDE.md` for the Persian user instructions.
