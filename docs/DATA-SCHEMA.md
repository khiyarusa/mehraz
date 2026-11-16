# MEHRAZ — Data Schema

Schema version **1** · backup format **mehraz-backup v1**

Everything a student produces lives in one record. There is no server, no
account, no sync. This document is the normative description of that record, of
the backup document, and of the content catalogue (whose full JSON Schema is
`content/content-contract.json`).

---

## 1. Where the record lives

| Layer | Detail |
| --- | --- |
| IndexedDB | database `mehraz`, version `1`, object store `kv`, key `mehraz:state` |
| localStorage (fallback) | key `mehraz:state`, JSON string |
| memory (last resort) | process memory only, lost on close |

The driver is chosen at boot by write/read probe (`storage.js`); the active
driver is shown in the sidebar and in Settings → ذخیرهسازی.

Only one record is written. Unknown keys present in the stored record are
preserved on write, so a future minor version cannot lose data written by this
one.

---

## 2. Application state (v1)

```jsonc
{
  "schemaVersion": 1,
  "profile": {
    "id": "stu_mwi6ugxofi7sq7",      // generated once, never reused
    "displayName": "نگار رضایی",       // 2..40 chars, trimmed
    "birthDate": {                   // Jalali, validated as a real date
      "jy": 1389, "jm": 3, "jd": 15,
      "iso": "2010-06-05"            // Gregorian ISO, derived
    },
    "grade": 11,                    // 7,8,9,10,11,12
    "track": "experimental",       // null for 7-9; math|experimental|humanities for 10-12
    "createdAt": "2026-11-15T18:48:55.356Z",
    "updatedAt": "2026-11-15T18:48:55.356Z"
  },
  "prefs": {
    "theme": "light",              // light | night
    "motion": "system",            // system | reduced
    "devPreview": false            // structural demo pack, developer switch
  },
  "progress": {
    "lessons": {
      "demo-lesson": {
        "status": "done",          // not-started | in-progress | done
        "openedAt": "2026-11-15T18:31:02.000Z",
        "lastOpenedAt": "2026-11-15T18:31:44.000Z",
        "completedAt": "2026-11-15T18:31:44.000Z",
        "section": 0               // last section index, reserved for phase 02
      }
    },
    "chapters": {}                 // reserved: chapterId -> { status, updatedAt }
  },
  "exams": {
    "attempts": [
      {
        "id": "att_mwi67i1eohmepz",
        "examId": "demo-exam",
        "title": "آزمون نمونهٔ ساختاری", // snapshot, survives content changes
        "startedAt": "2026-11-15T18:30:12.000Z",
        "finishedAt": "2026-11-15T18:30:52.000Z",
        "durationMs": 40123,
        "score": 4,
        "total": 4,
        "answers": { "demo-q1": 1, "demo-q2": "true", "demo-q3": [0, 2], "demo-q4": "12" },
        "detail": [
          { "qid": "demo-q1", "type": "mcq", "given": 1, "ok": true }
        ]
      }
    ]
  },
  "review": {
    "items": [
      {
        "id": "rev_...",
        "lessonId": "demo-lesson",  // optional
        "topicId": "demo-topic",    // optional
        "title": "مرور درس",
        "dueAt": "2026-11-18T00:00:00.000Z",
        "status": "scheduled",      // scheduled | done
        "createdAt": "...",
        "doneAt": null
      }
    ]
  },
  "activity": [
    { "id": "act_...", "type": "lesson.completed", "at": "2026-11-15T18:31:44.000Z",
      "meta": { "lessonId": "demo-lesson" } }
  ],
  "meta": {
    "createdAt": "2026-11-15T18:20:00.000Z",
    "updatedAt": "2026-11-15T18:31:44.000Z",
    "appVersion": "1.0.0",
    "installId": "mz_mwi6..."
  }
}
```

### Field rules

| Field | Rule on load (`state.normalizeState`) |
| --- | --- |
| `profile` | rejected (set to `null`) unless name 1–40 chars and grade ∈ 7..12; grades 10–12 additionally require a valid track; birth date must be a real Jalali date, otherwise dropped |
| `prefs.theme` | anything other than `night` becomes `light` |
| `prefs.motion` | anything other than `reduced` becomes `system` |
| `progress.lessons` | must be an object; unknown keys kept verbatim |
| `exams.attempts` | filtered to objects with `id` and `examId`, capped to the last 200 |
| `review.items` | filtered to objects with `id` |
| `activity` | filtered to objects, capped to the last 400 |
| unknown top-level keys | preserved |

Caps exist so a long-lived profile cannot grow without bound; the oldest
activity is dropped first.

### Lesson status transitions

```
not-started --(open lesson)--> in-progress --(علامتگذاری خواندهشد)--> done
                                    │
                                    └──(open again)──► in-progress (unchanged timestamp of completion)
```

`done` is terminal for that lesson id unless the student clears their data. A
lesson that was completed keeps `completedAt`; reopening it does not reset it
(the UI then shows "این درس خوانده شده").

---

## 3. Derived statistics (never stored)

| Value | Formula |
| --- | --- |
| lessons done | count of `progress.lessons[*].status === 'done'` |
| overall percent | `done / catalogueLessonCount * 100` (0 when the catalogue is empty) |
| exams taken | `exams.attempts.length` |
| average percent | mean of `score / total * 100` over attempts with `total > 0` |
| reviews due | `review.items` with `status !== 'done'` and `dueAt <= now` (or no `dueAt`) |
| book percent | completed lessons of that book / lessons in that book |
| week activity | activity entries whose local day falls in the current Saturday-started week |
| weak topics | per `topicId`/`topic` (fallback: chapter, then subject): wrong answers / answered |

Because they are derived, they can never disagree with the records, and there is
no "fabricated progress" path: with no records every value is zero and the UI
shows an empty state instead.

---

## 4. Versioning and migration

- `schemaVersion` is an integer on the record and in the backup.
- **Older** stored data (`< current`) is normalised upward by filling defaults and
  coercing types; a migration hook list is reserved in `state.js` for breaking
  changes.
- **Newer** stored data (`> current`) is never rewritten. The app loads defaults
  into memory, sets `store.futureData = true`, disables all writes, and shows a
  warning in Settings and a persistent toast. The original record is untouched.
- Same rule for backups: `schemaVersion > app` is refused with an explanation
  rather than partially imported.

Identifier stability: lesson, chapter and question ids are the join keys for
progress and attempts. Publishing a new textbook edition means **new ids** for
changed lessons; existing ids must keep resolving to the same pedagogical unit.

---

## 5. Backup document

```jsonc
{
  "format": "mehraz-backup",
  "formatVersion": 1,
  "schemaVersion": 1,
  "exportedAt": "2026-11-15T18:32:59.109Z",
  "app": { "name": "MEHRAZ", "version": "1.0.0", "build": "prompt-01",
           "locale": "fa-IR", "timezoneOffset": -210 },
  "summary": {
    "hasProfile": true, "displayName": "سارا محمدی", "grade": 10, "track": "math",
    "lessonsDone": 1, "lessonsTracked": 1, "examAttempts": 2,
    "reviewItems": 0, "activityEntries": 6
  },
  "payload": { "profile": {}, "prefs": {}, "progress": {}, "exams": {},
               "review": {}, "activity": [] }
}
```

File name: `mehraz-backup-<name>-<jalali-date>.json` (Persian name kept, unsafe
characters replaced with `-`).

### Validation performed before any write (`backup.parse`)

1. non-empty text, ≤ 12 MiB;
2. parses as JSON;
3. root is an object;
4. `format === "mehraz-backup"`;
5. `formatVersion` is a number ≥ 1 and **≤ 1** (newer format refused);
6. `schemaVersion` present and ≤ app schema (older is accepted with a warning);
7. `payload` is an object;
8. profile (if present): name string, grade ∈ 7..12, track valid for grade, birth
   date real;
9. `progress`, `exams`, `review` are objects when present; `activity` is an array;
10. `prefs` invalid → warning only (visual settings are non-critical).

Failures produce a Persian message per rule; the preview modal shows the summary
and the warnings, and nothing is written until the student confirms **twice**
(preview → final confirmation). Restore replaces the whole payload in one write;
a failed write is reported instead of being silently accepted.

`summary` inside the backup is informational — the app recomputes counts from
`payload` when previewing, so a hand-edited summary cannot mislead.

---

## 6. Content catalogue

Full JSON Schema: `content/content-contract.json`. Shape:

```
catalog { schemaVersion: 1, updatedAt, generator, books[] }
book    { id, title, grade, track|null, subject{id,title}, academicYear, edition,
          volume|null, demo?, chapters[], exams[], verification, source }
chapter { id, order, title, pageFrom, pageTo, lessons[], exams[], source }
lesson  { id, order, title, minutes, pageFrom, pageTo, objectives[],
          sections{ intro..references }, activities[], questions[],
          animation, verification, source }
question{ id, type: mcq|truefalse|multi|numeric, prompt, options[], correct,
          answer, tolerance, unit, explanation, topicId, topic, difficulty,
          points, source }
```

### `correct` by type

| Type | `correct` | Answer shape stored in an attempt |
| --- | --- | --- |
| `mcq` | `[index]` or `index` | number |
| `truefalse` | `"true"` / `"false"` | string |
| `multi` | sorted array of indexes | sorted number array |
| `numeric` | — (`answer` + `tolerance`) | number |

Scoring is 1 point per question (a `points` field is accepted and displayed; the
total is question count in phase 01). `multi` requires exact set equality;
`numeric` accepts `|given − answer| ≤ tolerance` after normalising Persian digits
and `٫`.

### Traceability

Every content item may carry `source`:

```json
{ "kind": "textbook", "publisher": "…", "title": "…", "academicYear": "1405-1406",
  "edition": "…", "isbn": "…", "reference": "فصل ۲، صفحهٔ ۳۴", "pages": "34-36",
  "verifiedAt": "...", "verifiedBy": "...", "note": "..." }
```

The runtime never fetches `url`; it exists for documentation and audit. Lessons
also carry `verification.status` (`draft` / `reviewed` / `verified`) so phase 02
can ship progressively without pretending unfinished content is verified.

---

## 7. Activity types

| `type` | Written when | `meta` |
| --- | --- | --- |
| `profile.saved` | profile created or edited | `{ grade }` |
| `lesson.opened` | lesson page mounted | `{ lessonId }` |
| `lesson.completed` | "خوانده شد" pressed | `{ lessonId }` |
| `exam.finished` | attempt recorded | `{ examId, score, total }` |
| `review.done` | review item completed | `{ itemId }` |

Only these five are produced in phase 01. The progress page renders them with
human labels; an unknown type degrades to "رویداد یادگیری" rather than breaking.

---

## 8. What is *not* stored

- No name, email, phone, address, school, or national identifier beyond the
  chosen display name.
- No device fingerprint, no user agent, no IP (impossible offline anyway), no
  analytics identifiers, no advertising identifiers.
- No free-text notes in phase 01 (reserved).
- No cookies: the app sets none.

The only identifiers are `profile.id` and `meta.installId`, both random and only
meaningful inside this browser.
