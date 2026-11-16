# MEHRAZ — Design System (PROMPT 02 · tokens revision 2)

Visual language: **editorial white, deep navy structure, one confident blue.**
The goal of the visual layer was not "more decoration" — it was composition:
every page should read as a designed spread, not a grid of identical boxes.

---

## 1. What changed from the foundation

| Area | Foundation (PROMPT 01) | PROMPT 02 |
| --- | --- | --- |
| Palette | flat semantic aliases | ink scale + accent set with explicit roles, higher-contrast muted text, gradient hero |
| Rhythm | one card style everywhere | five composition patterns: hero, stat band, continue card, subject card, editorial block |
| Illustration | none (icons only) | generated SVG art system: orbit, monograms, rings, area charts, empty-state scenes |
| Chrome | full-width mobile bar, storage chip in sidebar | floating pill navigation, student card in sidebar, scroll-aware topbar |
| Type | 15/1.85 body, 28 display | display up to 2.55rem in the hero, 1.3 line-height titles, 10px overlines with tracking |
| Motion | generic rise/fade | four-step duration scale, purposeful reveals, clipped sheen, reduced-motion parity |
| Density | uniform padding | deliberate scale: 20–40px depending on the panel's role |

---

## 2. Colour

### Ink (structure)
`--ink-950 #060F1B` · `--ink-900 #0A1727` · `--ink-800 #102338` · `--ink-700 #17314B`

### Blue (action)
`--blue-700 #1E51D6` · `--blue-600 #2F6BFF` · `--blue-500 #4D82FF` · `--blue-400 #7FA6FF`
`--blue-100 #E6EFFF` (soft) · `--blue-050 #F3F7FF` (wash)

### Functional accents — never decoration
`--mint-600 #0B8F76` (success / completed) · `--amber-600 #B07B22` (caution)
`--violet-600 #6A5AD8` · `--rose-600 #BE5568` (errors) · `--violet/rose` also seed
subject monograms so subjects differ without inventing new semantics.

### Surfaces
`--paper #FAFBFE` page · `--surface #FFFFFF` card · `--surface-2 #F7F9FD` inset ·
`--line #E4EAF3` hairline · `--line-2 #EEF2F8` internal divider.

### Text
`--t-900 #0B1A2B` headings · `--t-500 #566A82` secondary · `--t-400 #63748A` meta.

### Measured contrast (sRGB, WCAG 2.1)

| Pair | Ratio |
| --- | --- |
| Body text on paper | 16.9 : 1 |
| Secondary `--t-500` on white | 5.56 : 1 |
| Meta `--t-400` on white | 4.78 : 1 (10–12px labels, non-essential) |
| Section titles | 16.96 : 1 |
| White on hero navy (avg. #0D1E33) | ≈15 : 1 |

Colour never carries meaning alone: every state also changes text, icon or border.

---

## 3. Type

Stack unchanged and **no bundled webfont** (the Persian faces available on the
build machine are proprietary and may not be redistributed; Vazirmatn stays first
in the stack so a licensed copy can be dropped in later).

| Role | Size / weight | Notes |
| --- | --- | --- |
| Hero display | clamp(1.75 → 2.55rem) / 800 | 1.34 line-height, −0.02em tracking (Latin only) |
| Page title | clamp(1.45 → 2rem) / 700 | |
| Section title | 1rem / 700 | preceded by a 5px blue dot |
| Card title | 0.9375rem / 700 | |
| Body | 0.9375rem / 400 | 1.85 line-height |
| Reading body (lesson) | 0.875rem / 400 | 2.0 line-height |
| Meta / caption | 0.6875rem / 400–600 | |
| Overline | 0.625rem / 800 | legacy `.eyebrow`; **not used in new surfaces** — the page title carries the hierarchy |

Persian punctuation only (، ٫ ٪), ZWNJ in compounds, Persian digits via
`util.toFa`. Numbers are tabular in stats and tables.

---

## 4. Space, radius, elevation

- 4px scale; component padding is role-based: card 16–24, hero 22–40, compact row 12–15.
- Radii: 8 (micro) · 11 (small control) · 15 (control) · 20 (card) · 26 (hero mobile) · 34 (hero desktop) · pill.
- Elevation has three steps only: resting (`--sh-1`), lift on hover (`--sh-2`), floating/dialog/hero (`--sh-3`).
  Primary buttons carry a coloured shadow because they are the single action on a surface.

---

## 5. Composition patterns

1. **Hero** — greeting line with a live dot, 2-line promise, two actions, glass chips,
   and an orbit illustration whose arc is bound to real progress. Desktop: 1.18/0.82
   split. Mobile: the orbit becomes a corner texture (opacity .42) so the text leads.
2. **Stat band** — one surface, four cells, hairlines, 28px numerals, a 2px gradient
   rule that appears on hover. Replaces four separate boxes.
3. **Continue card** — the one place that answers "what now?": monogram tile, title,
   meta, ring, chevron.
4. **Subject card** — generated monogram (6 variants, deterministic per subject id),
   title, lesson count, progress line. Hover lifts 3px.
5. **Editorial block (lesson)** — numbered circle, section title, body at reading
   measure; empty sections become a dashed panel with a "در راه" chip, not a skeleton.

---

## 6. Art system (`src/scripts/art.js`)

All artwork is inline SVG generated at runtime — no images, no icon fonts, no canvas.

| Function | Used for |
| --- | --- |
| `art.monogram(seed,size)` | subject identity; hash of the subject id picks one of six geometric emblems and one of six accents |
| `art.orbit({pct})` | dashboard/welcome hero: three concentric orbit rings, progress arc, four floating glyph nodes |
| `art.ring(pct,opts)` | every progress ring (hero-adjacent, book, exam result, progress page) |
| `art.areaChart(values,labels)` | weekly activity |
| `art.empty(kind)` | empty states: library, lesson, exam, review, progress, search |
| `art.mesh(id)` | reserved page wash |

Determinism matters: a subject keeps the same emblem on the dashboard, in the
library and inside a book page, so the student learns to recognise it.

`prefers-reduced-motion` and the in-app «کاهش‌یافته» setting stop orbit rotation,
node floating and dash drift; nothing depends on an animation to be readable.

---

## 7. Motion

Four durations and two curves. Everything in the product uses them; there is no
per-view timing.

| Token | Value | Use |
| --- | --- | --- |
| `--d-1` | 120ms | press, toggle, nav feedback |
| `--d-2` | 220ms | small reveal: menu, toast, list item |
| `--d-3` | 340ms | context change: page, onboarding step, modal |
| `--d-4` | 560ms | data: progress fill, ring draw |

Easings: `--e-standard cubic-bezier(.2,.7,.3,1)` for state, `--e-entrance
cubic-bezier(.16,1,.3,1)` for things that arrive.

Signature moments:

- **Boot** (≈1s): the mark scales in while a ring draws itself, the wordmark rises,
  a 3px bar fills right-to-left, then the veil lifts. Skipped under reduced motion.
- **Page**: one 8px rise + fade for the whole surface (340ms). Children are **not**
  staggered; a page that assembles piece by piece reads as decoration.
- **Lists** (`.stagger`): max 6 items, 20–150ms, only where the items are peers.
- **Onboarding**: the step card arrives from the start edge (14px) and from the
  opposite edge when going back; re-rendering an error does not re-animate.
- **Rings / bars**: `--d-4` draw on mount, triggered once by `animateProgress`.
- **Nav**: the active rail scales in (340ms) instead of appearing instantly.
- **Primary button**: one clipped sheen sweep on hover, pointer devices only.

Rules: transform/opacity only; travel ≤ 22px; no infinite animation except the
ambient orbit; the `::after` sheen must stay inside the button box (an unclipped
transform widened the document scroll area by up to 540px and was a real defect).

---

## 8. Components (inventory)

Brand · nav item · sidebar student card · floating bottom nav · topbar (scroll-aware) ·
page head · section head · hero · stat band · continue card · subject card · grade card ·
track chip · chapter row · lesson row · editorial lesson block · TOC · breadcrumb ·
progress bar · ring · area chart · empty state (6 scenes) · banner · chip · dot ·
avatar · profile chip · menu · search box + results · buttons (primary/soft/ghost/quiet/danger,
3 sizes) · icon button · input/select/field/error · segmented control · tabs · accordion ·
quiz card · option · question navigator · table · skeleton · summary list · setting row ·
modal · bottom sheet · confirm dialog · toast · creator card · link button.

One implementation each, in `components.css` + `components.js`. Views compose, never clone.

---

## 9. RTL and Persian

Logical properties throughout (`margin-inline-start`, `inset-inline-end`,
`border-inline-start`). Directional icons are chosen for RTL (chevronEnd points left).
Latin fragments wrapped in `dir="ltr"`. The mobile bottom bar insets from both edges
so it reads as a floating control rather than a full-width band.

---

## 10. Accessibility

- Focus: 2px brand ring with 2px offset, never removed; `:focus-visible` only.
- Targets: 44px minimum on coarse pointers (buttons, nav items, TOC, options, menu).
- Landmarks + skip link; `main` receives focus after route change without stealing scroll.
- Dialogs: `role="dialog"`, `aria-modal`, Escape at document level, focus trap, scroll lock, focus return.
- Decorative progress bars inside links are `aria-hidden` with an `sr-only` percentage beside them.
- Contrast measured, not assumed (table above). Meta text below 12px is never the only carrier of information.

---

## 11. Do / don't

| Do | Don't |
| --- | --- |
| Let the hero carry the page | Stack five equal cards above the fold |
| Use one accent per subject | Colour every card differently |
| Keep empty states explanatory and quiet | Fill them with sample lessons |
| Animate the one thing that matters | Animate everything that mounts |
| Use the 4px scale | Invent 13px gaps |
| Prefer a hairline + one shadow | Glow or blur every surface |
| Write for a student | Explain how the site is built |
