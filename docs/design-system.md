# Design system

The visual contract every screen must follow. Tokens live in
`frontend/tailwind.config.ts`; component primitives live in `frontend/app/globals.css`.

## Palette

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#FAF7F2` | Page background (warm ivory, never pure white) |
| `canvas.deep` | `#F3EEE4` | Recessed areas, tracks, skeletons |
| `surface` | `#FFFFFF` | Cards and panels |
| `surface.muted` | `#FBF9F5` | Alternating section bands |
| `ink` | `#0B1B3A` | Primary navy typography |
| `ink.soft` / `ink.muted` / `ink.faint` | `#2F4269` / `#63739A` / `#98A3BC` | Body, secondary, tertiary |
| `line` / `line.strong` | `#E7E1D5` / `#CFC7B6` | Thin borders, hover borders |
| `primary` | `#4338CA` | Single primary action colour (indigo) |
| `violet` | `#6D28D9` | Policy / Nyay-Mitra |
| `mint` | `#0E9F6E` | Welfare, eligible, success |
| `peach` | `#E9683C` | Opportunities, CSC desk |
| `sky` | `#0C86C4` | Analytics, simulation |
| `amber` | `#C2740A` | Attention, partial match, offline |
| `rose` | `#D22A4C` | Blocking failure, ineligible |

One accent per category. Never mix more than two accents in a single card.

## Type scale

`display-xl` (hero) · `display` (section) · `headline` (sub-section) · body 14–16px ·
`nd-eyebrow` for 11px uppercase labels. Headings use `text-wrap: balance`, body uses `pretty`.

Latin: **Plus Jakarta Sans**. Devanagari: **Noto Sans Devanagari** via `font-deva`.

## Primitives

| Class | Purpose |
|---|---|
| `nd-card` | Standard surface: rounded-card, thin border, soft shadow |
| `nd-card-interactive` | Adds lift + border warm-up on hover |
| `nd-glass` | Translucent header/overlay surface |
| `nd-panel` | Muted inset panel |
| `nd-chip` | Small pill label |
| `nd-skeleton` | Shimmer loading block |
| `nd-section` | 1200px max-width page gutter |
| `nd-eyebrow`, `nd-lede`, `nd-numeric` | Text roles |

## Motion vocabulary

Defined once in `lib/motion.ts` — `springs.emblem`, `springs.morph`, `springs.snap`,
`fadeUp`, `fadeIn`, `scaleIn`, `stagger()`, `wordReveal`, `easings.civic`.

Rules:

1. Entrances travel 14–20px and last 0.5–0.7s with the `civic` easing.
2. Lists stagger children by 0.05–0.08s; never longer.
3. Hover lifts are `-translate-y-1` with an accent-tinted shadow.
4. The emblem is a shared element (`layoutId`) — screens hand it over, they do not redraw it.
5. Numbers count up once on entry; they never loop.
6. Everything above is disabled under `prefers-reduced-motion`.

## Required states

Every route ships four states: **loading** (skeleton, no spinner-only screens),
**empty** (explains what to do next), **error** (retry action, no stack traces),
**offline** (labelled with the last verification time).

## Accessibility

Semantic landmarks, visible focus ring (`:focus-visible`), AA contrast, full keyboard
navigation, `aria-label` on icon-only controls, layouts fluid down to 360px.
