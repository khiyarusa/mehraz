# Grade 10 — portal reconciliation

**Date:** 2026-11-17 · **Method:** official listings (`chap.sch.ir`), listing page 1 **and** page 2,
grade verified from each page heading, codes compared against `content/inventory.json`.

## What was wrong

| Finding | Evidence | Status |
| --- | --- | --- |
| Grade 10 had 26 records; the portal lists 27 unique codes | math listing 17, experimental 17, humanities 18; union 27 codes | fixed |
| «کتاب کار انگلیسی (۱)» (code 110231, page `/books/14266`) was missing | it sits on page 2 of the listing, which the scraper never read | fixed |
| `tracks` was wrong for 12 of 26 records | 8 under-marked (شیمی، ریاضی، آزمایشگاه، آمادگی دفاعی، جغرافیا، هنر، کارگاه، تفکر), 4 over-marked (دین و زندگی / عربی) | partly fixed |
| The old script rewrote `tracks` from a title regex | `tools/build-inventory.ps1` (pre-2026-11-17) | removed |

## What changed in the builder

1. **Pagination.** Each listing is now read as page 1 + `?page=1` + `?page=2`, so page-two books
   are no longer invisible. The inventory grew from 130 to **148** records.
2. **Track source of truth.** `tracks` now comes from the listing pages where a book actually
   appeared; the title-regex guessing pass was deleted. A book repeated across tracks is merged
   by its page id and keeps every track it was listed under.
3. **Grade 12** remains sourced from the numeric category nodes (711/712/709), as before.

## What is still not right

The portal publishes **separate editions per track** for some general subjects
(دین و زندگی 110204 vs 110205, عربی 110206 vs 110207). The verified mapping is:

| Code | Book | Required for |
| --- | --- | --- |
| 110204 | دین و زندگی (۱) | mathematics + experimental |
| 110205 | دین و زندگی (۱) | humanities |
| 110206 | عربی، زبان قرآن (۱) | mathematics + experimental |
| 110207 | عربی، زبان قرآن (۱) | humanities |

The listing pages do not repeat a code across two tracks, so a purely listing-derived `tracks`
field under-reports mathematics/experimental sharing. The same applies to science books that both
tracks study (فیزیک، شیمی، ریاضی، آزمایشگاه). Until this is modelled explicitly, `tracks` must be
read as **"where the portal listed this code"**, not as the final curriculum requirement.

`docs/GRADE-10-CURRICULUM.md` reports the distribution with that limitation stated.

## Not affected

- The download status, hashes and page counts are unaffected by track attribution.
- Lesson content already written (biology) is unaffected.
