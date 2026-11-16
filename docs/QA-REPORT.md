# MEHRAZ — QA Report (Phase 01)

Build: `2026-11-15 22:37` · artefact `start.html` 323.7 KB · 9 658 lines
Status legend: **PASS** · **FAIL** · **NOT TESTED** · **BLOCKED**

---

## 1. Scope and method

Everything below was executed against the real artefact opened as
`file:///F:/Save folder/My full Project/School/Full education/start.html` in a
Chromium-based browser pane (Chrome engine, Windows). No local server was used at
any point.

Method:

- Interactions driven through the actual UI (real clicks, real `change`/`input`
  events, real file objects for import) — not by calling internal functions that
  bypass the interface.
- State and geometry read through the page's own APIs (`MEHRAZ.store`,
  `performance.getEntriesByType`, `getBoundingClientRect`).
- Responsive layout measured in a development harness that mounts the built
  document in an `<iframe srcdoc>` at fixed widths (the harness is a dev artefact
  and is not part of the product).

## 2. Environment

| Item | Value |
| --- | --- |
| OS | Windows |
| Browser | Chromium-based pane (Chrome engine) |
| Protocol | `file://` |
| Viewport during UI tests | 425 × 731 CSS px (mobile-ish), plus 440 × 731 |
| Desktop widths exercised | 1024, 1280, 1440 (in harness, inside the same engine) |
| Storage driver in use | IndexedDB (`mehraz` / `kv` / `mehraz:state`), probe passed |
| Build tooling | PowerShell 5.1 (Node and Python were non-functional in this environment) |

**Environment limitations, stated up front:** no Android device, no second engine
(Firefox/Safari), no screen reader, no real browser process restart, no touch
hardware. Items that depend on those are marked NOT TESTED, not "assumed pass".

---

## 3. Summary

| Area | Items | PASS | FAIL | NOT TESTED |
| --- | --- | --- | --- | --- |
| Boot, shell, navigation | 8 | 8 | 0 | 0 |
| Onboarding & profile | 14 | 14 | 0 | 0 |
| Jalali calendar | 12 | 12 | 0 | 0 |
| Dashboard & empty states | 7 | 7 | 0 | 0 |
| Library / grade / book | 8 | 8 | 0 | 0 |
| Lesson interface | 7 | 7 | 0 | 0 |
| Exam engine | 12 | 12 | 0 | 0 |
| Review & progress | 6 | 6 | 0 | 0 |
| Settings & about | 10 | 10 | 0 | 0 |
| Backup / restore | 11 | 11 | 0 | 0 |
| Persistence | 4 | 3 | 0 | 1 |
| Responsive | 7 | 7 | 0 | 0 |
| Offline / network | 5 | 4 | 0 | 1 |
| Accessibility | 9 | 6 | 0 | 3 |
| Performance | 5 | 5 | 0 | 0 |
| Android device | 1 | 0 | 0 | 1 |

All executed items passed after the fixes listed in §12. There are no open FAIL
items.

---

## 4. Boot, shell, navigation — PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Cold open of `start.html` renders the welcome page | PASS | `#view` populated, `MEHRAZ.store.ready === true`, `diag.errors === []` |
| 2 | Boot splash disappears after boot | PASS | `#boot` removed from DOM |
| 3 | First paint does not navigate (no stray history entry) | PASS | bare URL, dashboard/welcome rendered directly |
| 4 | Sidebar renders 6 nav items + extra group + about link | PASS | 6 `.navitem` nodes at ≥1024 px |
| 5 | Bottom navigation renders exactly 5 items below 1024 px | PASS | 5 `.bottomnav__item` nodes |
| 6 | Active nav state follows the route | PASS | `aria-current="page"` on the matching item |
| 7 | Unknown route renders the designed 404 | PASS | `#/nope` → "این نشانی وجود ندارد" |
| 8 | Profile-required route without a profile redirects | PASS | `#/library/10` with empty storage → `#/onboarding` |

## 5. Onboarding and profile — PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 9 | Step 1 name validation: empty rejected | PASS | "نام نمایشی را وارد کنید." |
| 10 | Name under 2 characters rejected | PASS | code path + manual check |
| 11 | Name 40 characters accepted, longer blocked by `maxlength` | PASS | attribute + validation |
| 12 | Grade 10+ shows the track step, 5 steps total | PASS | chip "گام ۳ از ۵" appears after choosing grade 10 |
| 13 | Grades 7–9 never show the track step | PASS | grade 7 edit → no `[data-track]`, no track row in summary |
| 14 | Track is required for grades 10–12 | PASS | advancing without a track shows "رشتهٔ تحصیلی را انتخاب کنید." |
| 15 | Confirmation screen shows every collected value | PASS | name, "۱۲ مرداد ۱۳۹۰", "پایهٔ دهم", "ریاضی و فیزیک" |
| 16 | Each summary row can be edited individually | PASS | "ویرایش" jumps to that step |
| 17 | Confirming creates the profile and enters the dashboard | PASS | `#/dashboard`, greeting uses the name |
| 18 | Profile survives reload | PASS | see §14 |
| 19 | Editing the name from Settings persists | PASS | name updated, `#/settings` toast shown |
| 20 | Edit mode saves without walking every step | PASS | "ذخیرهٔ تغییرات" validates all fields at once |
| 21 | Revisiting the site skips onboarding | PASS | bare URL → dashboard when a profile exists |
| 22 | No account, password or email field exists anywhere | PASS | code + UI inspection |

## 6. Jalali calendar — PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 23 | Gregorian → Jalali conversion | PASS | 2026-11-15 → 1405-08-24 (Sunday) |
| 24 | Jalali → Gregorian for storage | PASS | 1389-03-15 → 2010-06-05 |
| 25 | 31-day months (1–6) | PASS | `monthLength(1404, 11) = 31` |
| 26 | 30-day months (7–11) | PASS | day list rebuilt to 30 options for Bahman |
| 27 | Esfand in a common year = 29 days | PASS | 1392 and 1404 → 29; day list 29 options |
| 28 | Esfand in a leap year = 30 days | PASS | 1403 → 30 |
| 29 | Leap-year detection | PASS | 1403 leap, 1392/1404 common |
| 30 | Impossible date rejected | PASS | day 30 cannot exist for Esfand 1404; assignment yields empty → "کامل انتخاب کنید" |
| 31 | Day list rebuilds when month/year changes | PASS | 1392/12 → max 29; 1392/11 → max 30 |
| 32 | Empty input rejected | PASS | "روز، ماه و سال تولد را کامل انتخاب کنید." |
| 33 | Future dates impossible | PASS | year list is 1396…1380 (today−9 … today−25); `validBirth()` also rejects future dates defensively |
| 34 | Age sanity (9–25 years) | PASS | 1390 → "۱۵ سال" on the dashboard |

## 7. Dashboard and empty states — PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 35 | Greeting uses the stored name and time of day | PASS | "شب بخیر، …" |
| 36 | Date chip shows the Jalali date with weekday | PASS | "یکشنبه، ۲۴ آبان ۱۴۰۵" |
| 37 | Statistics reflect real records only | PASS | 0 lessons / 0 exams with an empty record; 1 lesson / 2 exams / 50 % after the flow |
| 38 | Empty states explain what will fill them | PASS | 4 distinct empty states, no invented data |
| 39 | Continue-learning card picks the in-progress lesson | PASS | after opening a lesson the card shows it |
| 40 | Recent exams list shows score and relative time | PASS | "۴/۴ ۱۰۰٪ ۸ دقیقه پیش" |
| 41 | Week chart counts only real activity entries | PASS | "در این هفته ۶ رویداد یادگیری ثبت شده است." |

## 8. Library, grade and book — PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 42 | Six grades listed in two cycles | PASS | 6 `.gradecard`; "متوسطهٔ اول" / "متوسطهٔ دوم" |
| 43 | High-school grades expose three tracks | PASS | 12 track chips total |
| 44 | Grade 10 without a track asks for one | PASS | "رشته را انتخاب کنید", exactly one selector (duplicate fixed) |
| 45 | Grade with no content shows an honest empty state | PASS | "هنوز کتابی برای این پایه ثبت نشده" |
| 46 | No invented subject or lesson in phase 01 | PASS | catalogue ships `books: []`; only the dev demo pack can add content |
| 47 | Book page lists chapters as accordions with progress | PASS | demo book: 1 chapter, 1 lesson, % کامل |
| 48 | In-book search filters lessons | PASS | typing in the book search hides non-matching rows |
| 49 | Subject route resolves to the book when unique | PASS | `#/subject/demo-subject` → book page |

## 9. Lesson interface — PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 50 | Ten sections always rendered | PASS | 10 `[data-section]` nodes |
| 51 | TOC mirrors the sections | PASS | 10 `[data-toc]` links |
| 52 | Empty sections show a designed placeholder | PASS | 10 `.section-ph` blocks, no fake text |
| 53 | Scroll-spy highlights the section in view | PASS | "درآمد" active on load; updates on scroll |
| 54 | Marking a lesson read persists | PASS | `isLessonDone === true` after reload |
| 55 | Chapter navigation (prev/next) present when applicable | PASS | buttons render only when neighbours exist |
| 56 | Demo content is unambiguously labelled | PASS | persistent amber banner + chip "نمونهٔ ساختاری" |

## 10. Examination engine — PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 57 | Four question types render | PASS | mcq, true/false, multi, numeric |
| 58 | Single-choice selection updates state | PASS | `aria-pressed` toggles, navigator colour changes |
| 59 | Multi-answer accumulates and deselects | PASS | two options selected, sorted array stored |
| 60 | Numeric input accepts Persian digits | PASS | normalised before scoring |
| 61 | Question navigator jumps and marks answered | PASS | `.is-answered` count matches |
| 62 | Answered counter and progress bar update | PASS | "۴ پاسخ دادهشده" |
| 63 | Submission asks for confirmation | PASS | dialog appears, cancel returns to the exam |
| 64 | Unanswered questions are reported before submit | PASS | "… پرسش بیپاسخ مانده است" |
| 65 | Scoring is exact | PASS | 4/4, 0/4 and 2/4 runs |
| 66 | Result page lists every question with your answer and the key | PASS | 4 review rows |
| 67 | "Wrong answers only" filter works | PASS | 4 rows → 2 visible, 0 correct rows visible |
| 68 | Attempts appear in history and in the dashboard | PASS | list + table rows + progress page |

## 11. Review and progress — PASS (data-dependent actions NOT TESTED)

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 69 | Review page renders without items | PASS | honest empty state for today, upcoming, completed |
| 70 | Weak topics derived from wrong answers | PASS | "۴ پاسخ نادرست از ۸ پرسش — ۵۰٪" |
| 71 | Wrong-answer history table | PASS | 4 rows with exam and relative time |
| 72 | Progress page computes from records | PASS | 100 % lessons, 50 % average from 0 % and 100 % attempts |
| 73 | Progress empty state when nothing exists | PASS | "هنوز دادهای برای نمایش نیست" |
| 74 | "مرور شد" action | NOT TESTED | no review items exist in phase 01 by design; the handler is wired but unreachable without phase 02 data |

## 12. Settings and about — PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 75 | Profile card + edit entry | PASS | `#/profile/edit` |
| 76 | Theme switch applies immediately | PASS | `data-theme="night"`, body background `rgb(11, 22, 34)` |
| 77 | Motion preference applies | PASS | `data-motion="reduced"` collapses durations |
| 78 | Reset appearance restores defaults | PASS | light + system |
| 79 | Storage diagnostics show driver, probe result, timestamp | PASS | "IndexedDB — موفق" |
| 80 | Re-run probe works | PASS | re-probes and refreshes |
| 81 | Export produces a valid document | PASS | 4 890 B, `format: mehraz-backup` |
| 82 | Clear data requires confirmation and returns to welcome | PASS | `#/welcome`, profile `null` |
| 83 | About page shows creator name and both handles | PASS | "آمین", `@Mozrd`, `@angosht0` |
| 84 | Creator details appear nowhere else | PASS | dashboard text has no `Mozrd` |

## 13. Backup and restore — PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 85 | Export document structure | PASS | format, formatVersion, schemaVersion, exportedAt, app, summary, payload |
| 86 | Summary counts match the payload | PASS | 1 lesson, 2 attempts, 6 activity entries |
| 87 | Download creates a Blob with the right name | PASS | `mehraz-backup-سارا-محمدی-1405-08-24.json`, 4 944 B |
| 88 | Import preview before writing | PASS | 7 summary rows + warnings |
| 89 | Import requires a second confirmation | PASS | separate "تأیید نهایی" step |
| 90 | Restore replaces the record | PASS | renamed profile restored to "سارا محمدی" |
| 91 | Restore reachable with no profile | PASS | welcome → "بازیابی از پشتیبان" → dashboard |
| 92 | Non-backup file rejected | PASS | "این فایل، پشتیبان مهراز نیست." |
| 93 | Malformed JSON rejected | PASS | "ساختار JSON فایل پشتیبان معتبر نیست." |
| 94 | Newer schema rejected | PASS | "… از نسخهٔ فعلی برنامه جدیدتر است … بازیابی انجام نشد." |
| 95 | Invalid grade rejected | PASS | "پایهٔ تحصیلی در پشتیبان معتبر نیست." |

## 14. Persistence — PASS (with one NOT TESTED item)

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 96 | Write/read probe | PASS | `IndexedDB write / read-back probe passed` |
| 97 | Profile + progress + attempts survive reload | PASS | after reload: profile "نگار رضایی", 1 lesson done, 2 attempts, prefs kept |
| 98 | Same record visible from a second tab | PASS | new tab opened the dashboard with the same profile |
| 99 | Full browser restart | **NOT TESTED** | the automation pane tears down its storage context when the last tab closes, so a true process restart could not be performed; IndexedDB semantics and the reload/new-tab results are the available evidence |

## 15. Responsive — PASS

Measured in the harness with `documentElement.scrollWidth − clientWidth` and a
scan for elements crossing the viewport edges.

| Requested width | Layout width | Horizontal overflow | Sidebar | Bottom nav |
| --- | --- | --- | --- | --- |
| 360 | 345 | 0 | hidden | shown |
| 390 | 375 | 0 | hidden | shown |
| 414 | 399 | 0 | hidden | shown |
| 768 | 753 | 0 | hidden | shown |
| 1024 | 1009 | 0 | shown | hidden |
| 1280 | 1265 | 0 | shown | hidden |
| 1440 | 1425 | 0 | shown | hidden |

Additional: the mobile DOM at 390 px contains no element wider than the viewport
except intentionally scrollable strips (tables, segmented control, charts), which
are clipped by their own containers.

## 16. Offline and network — PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 100 | Zero sub-resource requests | PASS | `performance.getEntriesByType('resource')` → `[]` |
| 101 | CSP present and restrictive | PASS | meta tag with `default-src 'none'`, `connect-src 'none'` |
| 102 | No network API in the artefact | PASS | build gate + text search: no `fetch(`, no `XMLHttpRequest`, no `import(` |
| 103 | Full flow works with no network use | PASS | every tested flow completed with no request |
| 104 | Physical offline test on a device (airplane mode) | **NOT TESTED** | no device access; network independence is established by 100–103 |

## 17. Accessibility — partial PASS

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 105 | Landmarks and skip link | PASS | `aside/header/main/nav/footer`, skip link first in tab order |
| 106 | Every form control has a label | PASS | `<label for>` or `aria-label` on all inputs/selects |
| 107 | Visible focus ring | PASS | `:focus-visible` 2 px brand outline |
| 108 | Text contrast | PASS | 16.27:1 body, 4.76:1 muted, 14.59:1 night |
| 109 | Dialog semantics, Escape, scroll lock, focus return | PASS | `role="dialog"`, `aria-modal`, Escape resolves, body unlocked |
| 110 | Reduced motion honoured | PASS | OS media query + in-app attribute both collapse animations |
| 111 | Charts have text alternatives | PASS | `role="img"` + caption with the total |
| 112 | Screen reader pass (NVDA / TalkBack) | **NOT TESTED** | no screen reader available in this environment |
| 113 | 44 px touch targets on real touch hardware | **NOT TESTED** | CSS rule exists under `@media (pointer: coarse)`; the test browser is a fine pointer, so it could not be exercised |

## 18. Performance — PASS

| Metric | Value |
| --- | --- |
| File size | 323.7 KB (single file, uncompressed) |
| DOMContentLoaded | 108 ms |
| Load | 114 ms |
| DOM nodes (dashboard) | 392 |
| JS heap after full flow | ~2–3 MB |
| Sub-resource requests | 0 |
| Network transfer | 0 bytes |
| Screenshot-verified repaint | no layout thrash observed while scrolling the dashboard |

No continuous animation runs on off-screen content; the only infinite animations
are the skeleton shimmer (only visible while a placeholder is on screen) and the
storage status dot.

## 19. Defects found during QA and fixed

| # | Defect | Severity | Fix |
| --- | --- | --- | --- |
| 1 | First load rendered an empty `#view`: the hash redirect ran before the `hashchange` listener existed | blocker | boot renders the entry route directly, no navigation |
| 2 | `[hidden]` was overridden by component `display` rules, so empty review badges and the profile chip were visible before a profile existed | major | global `[hidden] { display: none !important }` |
| 3 | Grade cards in onboarding stacked vertically, wasting a screen each | major | row layout + two-column grid |
| 4 | Changing a birth-date select re-rendered the step and dropped focus | major | only the day list is rebuilt |
| 5 | Summary rows put the value and the edit button against each other | minor | dedicated edit variant of the row |
| 6 | `futureData` stayed `true` after a later successful load, which would block every write after one future-version encounter | major | reset the flag at the start of `store.init()` |
| 7 | Escape did not close a dialog if focus had left the panel | major | document-level capture handler |
| 8 | Grade 10 page rendered the track selector twice | minor | one selector in the header, empty state without actions |
| 9 | Build gate matched `openImport(` as a dynamic import | build | word-boundary lookbehind in the gate |
| 10 | Decorative progress bars polluted the accessible name of subject cards ("… 100") | minor | `aria-hidden` + screen-reader percentage text |
| 11 | Boot redirect resolved against the container URL inside `srcdoc`, navigating the dev harness into itself | dev | side-effect-free boot (also the correct product behaviour) |

## 20. Known limitations and residual risks

1. **Android untested.** The self-contained build removes the usual
   `content://` failure mode (no sibling files are needed), but storage behaviour
   on Android file managers is unverified. The Persian guide warns about it.
2. **Browser restart untested** (see §14 item 99). IndexedDB is durable by
   specification; the app additionally warns when it is not available at all.
3. **Single engine.** Firefox and Safari were not exercised. The code avoids APIs
   known to be restricted on `file://`, and every risky capability is probed
   rather than assumed, but this is not a substitute for testing.
4. **Screen readers untested.** Markup follows standard patterns (landmarks,
   labels, live regions, `aria-pressed`), but no assistive technology pass was run.
5. **Real touch targets untested**; the coarse-pointer rules are unexercised here.
6. **Storage is unencrypted** and shared by all local files of the same origin in
   some engines; documented in Settings and in the offline requirements.
7. **Phase 02 content will change the size and the DOM budget.** The gates in
   `PHASE-02-INTEGRATION.md` §8 must be re-run.

## 21. How to reproduce the core tests

```
1. Open start.html from disk (double click, or Ctrl+O).
2. First run: "شروع یادگیری" → name → birth date → grade → (track) → confirm.
3. Reload the page: the dashboard must return with the same name and counters.
4. Settings → "دریافت پشتیبان": a .json file is produced.
5. Settings → "پاککردن" → confirm: the app returns to the welcome page.
6. Welcome → "بازیابی از پشتیبان" → choose the file → confirm twice.
7. Dashboard must show the original name, lessons and exams.
8. Settings → ابزار توسعه → "پیشنمایش ساختاری" = روشن, then open
   Library → کتاب نمونه → درس نمونه, mark it read, and run the sample exam.
9. DevTools → Network → Offline → reload: steps 2–8 must behave identically.
```
