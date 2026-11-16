# MEHRAZ — Design System

Version 1.0.0 · phase 01

The visual language is "quiet academic": white paper, deep navy structure, one
confident blue for action, generous space, no decoration that does not carry
meaning. Everything is RTL-first.

---

## 1. Brand

### Mark

A geometric arch inside a rounded square: the outer arch is drawn at 42 % white
so it reads as a plan, the inner arch is solid white, and a keystone sits above.
It references architecture and a gateway to knowledge — not a school icon, not a
book clip-art.

```
24×24 viewBox
M3.6 20.4V9.9L12 5.2l8.4 4.7v10.5   (outer, 1.5 stroke, white 42%)
M7.7 20.4v-7.2L12 10.7l4.3 2.5v7.2  (inner, 1.7 stroke, white)
M12 3.4v3.2 + rect(10.5,2,3,1.5)    (keystone)
```

The mark sits on a 155° blue gradient (`#2f6df0 → #1d4ed8 → #17347a`) with a
hairline inner highlight. Sizes: 40 px (header/sidebar), 32 px (compact), 54 px
(boot splash), 30 px (splash glyph).

### Wordmark

Persian «مهراز» in 700 weight, above the tracked Latin `MEHRAZ` (0.34 em, 8 px,
uppercase, muted). The Latin line is a texture, not a second logotype; it is
hidden below 380 px.

### Usage

- Sidebar: `onDark` variant, white wordmark, Latin at 50 % white.
- Mobile header: compact variant, ink wordmark.
- Never place the mark on a busy photograph. Never recolour the arches.

---

## 2. Colour

Two layers: raw brand values, then semantic aliases. **Components only use the
semantic aliases**, which is what makes the night theme a token swap rather than
a second stylesheet.

### Raw palette (fixed by the brand brief)

| Token | Value | Use |
| --- | --- | --- |
| `--palette-bg` | `#FFFFFF` | page |
| `--palette-navy` | `#14243B` | structure, hero |
| `--palette-navy-deep` | `#0D1B2A` | sidebar base, hero end |
| `--palette-blue` | `#2563EB` | primary action |
| `--palette-blue-2` | `#3B82F6` | gradient partner, active accents |
| `--palette-blue-soft` | `#EAF2FF` | selected surfaces |
| `--palette-text` | `#172033` | body |
| `--palette-text-2` | `#64748B` | secondary text |
| `--palette-border` | `#E5EAF1` | hairlines |
| `--palette-surface` | `#F6F8FC` | inset surfaces |
| `--palette-success` | `#16876B` | success |
| `--palette-warning` | `#D69E36` | caution |
| `--palette-danger` | `#D95353` | destructive |

### Semantic aliases (light)

`--bg`, `--bg-sunken`, `--bg-raised`, `--bg-translucent`, `--bg-inset`,
`--surface`, `--surface-2`, `--surface-3`, `--border`, `--border-strong`,
`--txt-strong`, `--txt`, `--txt-muted`, `--txt-faint`, `--brand`, `--brand-hover`,
`--brand-2`, `--brand-soft`, `--brand-soft-2`, `--brand-line`, `--ok`, `--ok-soft`,
`--warn`, `--warn-soft`, `--danger`, `--danger-soft`, `--nav-navy`, `--nav-text`.

### Night theme

`[data-theme="night"]` on `<html>` swaps the aliases (background `#0b1622`,
surface `#101f2e`, border `#1e3046`, text `#dde7f4`, brand `#4c8df6`). The
sidebar stays navy, so the identity holds in both themes.

### Measured contrast (WCAG 2.1, sRGB)

| Pair | Ratio | Result |
| --- | --- | --- |
| Body text on page (light) | 16.27 : 1 | AAA |
| Secondary text `--txt-muted` on white | 4.76 : 1 | AA |
| Body text on page (night) | 14.59 : 1 | AAA |
| White on hero navy | 13.4 : 1 | AAA |
| Hero meta text (white 82 %) on navy | 8.6 : 1 | AAA |
| Primary button white on `#2563EB` | 4.9 : 1 | AA |

Colour is never the only signal: states also change icon, text, or border.

---

## 3. Typography

### Stack

```css
--font-sans: "Vazirmatn", "IRANSansX", "Segoe UI", "Noto Naskh Arabic",
             Tahoma, Roboto, "Droid Arabic Naskh", system-ui, sans-serif;
```

**Why no bundled webfont.** A redistributable, licensed Persian webfont was not
available in the build environment; the Persian faces present on this machine
(B Nazanin, B Mitra, IRAN Sans variants) are commercial and may not be
redistributed. Shipping them would be a licence violation, and downloading one at
runtime is forbidden. The stack therefore resolves to a high-quality
Persian-capable system face on every target: Segoe UI / Tahoma on Windows, Noto
Naskh Arabic / Roboto on Android. Vazirmatn is first so that a licensed copy
dropped into the project in phase 02 takes effect with no code change.

### Scale

| Token | Size | Use |
| --- | --- | --- |
| `--fs-11` | 11 px | chips, meta, footnotes |
| `--fs-12` | 12 px | small UI text |
| `--fs-13` | 13 px | card body, lists |
| `--fs-14` | 14 px | buttons, dense reading |
| `--fs-15` | 15 px | default body |
| `--fs-16` | 16 px | section titles |
| `--fs-18/20` | 18/20 px | card titles, sub-headings |
| `--fs-24/28` | 24/28 px | page titles |
| `--fs-34/44` | 34/44 px | hero greeting |

Weights 400 / 500 / 600 / 700 only. Line height: 1.35 titles, 1.55 snug,
**1.85 body**, 2.0 loose — Persian ascenders and diacritics need the extra room.

Numbers use `--font-num` with `font-variant-numeric: tabular-nums` and Persian
digits via `util.toFa()`. Percentages are `۵۰٪` (number first, sign after), which
is what RTL bidi produces naturally and what Iranian textbooks use.

Rules: no letter-spacing on Persian; no text-transform; `overflow-wrap` never
forced (long Persian words are common — containers use `min-width: 0` instead);
no clipping through fixed heights on text blocks.

---

## 4. Space, radius, elevation

- Space scale 4 px base: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, 80.
- Radii: 6 (micro), 10 (inputs compact), 14 (buttons/cards small), 18 (cards),
  24 (hero/panels), 30 (onboarding), pill for chips.
- Shadows: `--sh-1` (resting card), `--sh-2` (hover lift), `--sh-3` (modal, hero),
  `--sh-brand` (primary button), `--ring` (focus).
- Elevation is used in four steps only. A card either rests, lifts 2 px on hover,
  or floats as a dialog. No glow, no coloured shadow except the brand button.

---

## 5. Layout

| Breakpoint | Behaviour |
| --- | --- |
| ≥ 1500 px | content max 1200 px |
| ≥ 1024 px | persistent sidebar (248–274 px) + sticky topbar, no bottom nav |
| ≤ 1023 px | sidebar hidden, bottom navigation (5 items), compact topbar, content padding + safe area |
| ≤ 640 px | single-column grids, stacked hero, full-width buttons, two-column modal footer |
| ≤ 380 px | one-column stats, Latin wordmark hidden |

Content width: `--content-max` 1120 px, centred, padding `clamp(16px, 3vw, 32px)`.
Sidebar on the right in RTL (first grid column). The sidebar is `position:
sticky` with its own scroll; the topbar is sticky with a translucent blurred
backdrop.

Nothing may overflow horizontally: `body { overflow-x: hidden }` is a safety net,
not a fix — the responsive audit asserts `scrollWidth === clientWidth` at 360,
390, 414, 768, 1024, 1280 and 1440.

---

## 6. Components

Inventory: brand, navigation item, sidebar, bottom navigation, topbar, page head,
section head, card, hero, statistic card, progress bar, donut, week chart,
breadcrumb, chip, dot, empty state, banner, avatar, profile chip, menu, search
box + results panel, buttons (primary / soft / ghost / quiet / danger / sizes),
icon button, input, select, field + error, segmented control, tabs, accordion,
grade card, track chip, subject card, chapter row, lesson row, quiz card, option,
question navigator, table, skeleton, placeholder block, TOC, stepper, summary
list, setting row, modal, bottom sheet, confirmation dialog, toast, creator card,
link button, heat cell.

Every one is defined once in `components.css` and rendered by one helper in
`components.js`. No page invents its own button or its own card.

### Component contracts

- **Empty state** — icon in a bordered tile, title, one or two sentences that
  explain *why* it is empty and what will fill it, optional actions. Never a
  decorative illustration instead of an explanation.
- **Statistic card** — label + icon, value in tabular numerals, footnote that
  states the denominator ("از ۰ درس"), never a fabricated delta.
- **Progress** — one track, one fill, optional label row. Animates width once on
  mount (420 ms, `--e-soft`). Decorative instances are `aria-hidden` and carry a
  screen-reader percentage in the surrounding link.
- **Modal** — heading, optional subtitle, scrollable body, action row. Focus moves
  in, is trapped, Escape closes, focus returns to the trigger, background scroll
  locked.
- **Toast** — bottom centre, auto-dismiss 4.2 s (or persistent for warnings),
  optional action. Maximum three stacked.
- **Question card** — type chip, index chip, prompt, options; options are buttons
  with `aria-pressed`, multi-answer uses square markers, numeric answers use an
  input that accepts Persian digits.

---

## 7. Motion

A single vocabulary; no ad-hoc timings.

| Token | Value | Use |
| --- | --- | --- |
| `--d-instant` | 90 ms | press feedback |
| `--d-fast` | 140 ms | hover, colour |
| `--d-base` | 220 ms | small reveals |
| `--d-slow` | 340 ms | cards, accordion |
| `--d-page` | 420 ms | page entrance |
| `--d-hero` | 700 ms | progress fill, chart |

Easings: `--e-out` `cubic-bezier(.22,.61,.36,1)`, `--e-inout`
`cubic-bezier(.4,0,.2,1)`, `--e-soft` `cubic-bezier(.16,1,.3,1)`.

Repertoire: page rise (10 px + fade), staggered card entrance (30–330 ms by
index), progress width transition, donut dash-offset transition, bar growth with
`transform: scaleY`, accordion via `grid-template-rows: 0fr → 1fr`, modal
scale-in 0.985 → 1, sheet slide-up, toast slide-in, skeleton shimmer, pulsing
storage dot, button press scale 0.982.

Rules: travel ≤ 12 px, no bounce, no parallax, no infinite animation except the
skeleton shimmer and the storage dot, never animate off-screen content, never
animate a property that triggers layout when a transform will do.

`prefers-reduced-motion: reduce` **and** the in-app setting
`[data-motion="reduced"]` collapse every duration to 0.001 ms and remove
transforms. All functionality is identical without motion.

---

## 8. RTL and Persian

- `dir="rtl"` on `<html>`; layout uses logical properties
  (`margin-inline-start`, `inset-inline-end`, `border-inline-end`) so mirroring is
  automatic.
- Latin fragments (handles, file names, numbers in code) are wrapped in
  `dir="ltr"` spans.
- Icons that imply direction (chevrons, arrows) are chosen for RTL: "forward" is
  `chevronEnd` which draws left-pointing.
- Punctuation: Persian comma «،», guillemets «» for quotations, ZWNJ (نیمفاصله)
  used in compounds (`میشود`, `کتابخانه`).
- Dates: Jalali, `۲۴ آبان ۱۴۰۵`, weekday-first in the dashboard header.
- Numbers: Persian digits everywhere in UI; inputs accept both Persian and Latin
  digits and normalise internally.

---

## 9. Accessibility

- Semantic landmarks: `aside`, `header`, `main#view` (`tabindex="-1"`), `nav`
  with labels, `footer`.
- Skip link to `#view` as the first focusable element.
- Visible `:focus-visible` ring (2 px brand + 2 px offset), never removed.
- Touch targets: 44 px minimum on coarse pointers (buttons, icon buttons, TOC
  links, menu items, question navigator, profile chip); desktop may compress to
  36 px for dense secondary actions.
- Forms: explicit `<label for>`, `aria-invalid` semantics via error text with
  `role="alert"`, errors announced through a polite live region.
- All interactive elements are real `<button>`/`<a>`; no click-handled divs.
- Every button performs an action; there are no decorative buttons.
- Charts carry `role="img"` with a text alternative; the week chart also states
  the total in its caption.
- Motion respects the OS setting; contrast is measured, not assumed.

---

## 10. Do / don't

| Do | Don't |
| --- | --- |
| Use one blue for action, navy for structure | Colour headings or use blue for body text |
| Let empty states explain the next step | Fill empty space with sample data |
| Use the 4 px scale | Invent 13 px gaps |
| One idea per card | Stack three actions of equal weight |
| Keep the hero for greeting + one action | Put charts and tables inside the hero |
| Prefer hairline borders over shadows | Glow, blur or gradient every surface |
| Persian digits and Jalali dates | Latin digits in Persian sentences |
| Test at 360 px first | Design desktop then squash |
