# Design

<!-- impeccable:design-schema 1 -->

## Direction

Category standard for booking/agenda SaaS, executed at the craft level of
**Calendly + Fresha + Linear** — explicitly chosen by the user over a more
experimental direction (a "ticket/receipt system" concept was proposed and
declined in favor of the familiar, well-executed convention). Played
straight, no irony or smuggled quirk, per the standing-exit protocol.

## Palette

- **Accent (interactive/CTA):** `--color-accent` (#74b9ff, light) for large
  surfaces/gradients where contrast isn't load-bearing; `--color-accent-dark`
  (#185FA5) for anything carrying white text — the light accent alone fails
  contrast for white text (2.1:1, found and fixed during this pass).
- **Secondary hues (background system only):** `--color-lavender` (#a29bfe),
  `--color-mint` (#55efc4) — used at low opacity (12-16%) in the ambient
  background blobs, never as text/button surfaces.
- **Neutrals:** existing `--color-bg-page` / `--color-text-main` /
  `--color-text-muted` tokens, unchanged.
- Feature-carousel cards use four soft gradient themes (blue/mint/lavender/
  coral) — pre-existing, kept.

## Type

- Display/headings: **Montserrat** (700-900) — pre-existing brand
  typeface used across the whole app (admin/employee dashboards, business
  pages), kept deliberately for consistency even though the mechanical
  detector flags it as an overused face. Swapping it here alone would have
  made the platform pages visually inconsistent with the rest of the
  product; a full app-wide type change was out of scope for this pass.
- Body: **Quicksand** (400-700) — same reasoning.
- **Real bug fixed this pass:** neither face was ever loaded anywhere in
  the app (no `@font-face`, no stylesheet link) — every "Montserrat"/
  "Quicksand" reference across the whole codebase was silently falling
  back to the system sans. Fixed by adding a Google Fonts link in
  `public/index.html`.

## Layout system

- **Floating pill nav** (`PlatformNav.jsx`/`.css`) replaces the old
  full-width header — a single glass pill (backdrop-blur, translucent
  white) containing the wordmark and one CTA button, condensing (scale +
  shadow, not width/padding — see Motion) on scroll. Shared by the general
  landing and every giro landing.
- **Ambient background system** (`PlatformBackground.jsx`/`.css`) — fixed
  behind all platform pages, not just the hero: 3 large slow-drifting
  blurred gradient blobs (accent/lavender/mint) at 12-16% opacity, plus a
  fine SVG-noise grain layer at 5% opacity blended with `overlay`, so flat
  page background never reads as plastic/flat white.
- Hero stays the existing "capsule" pattern (rounded, image/video
  background, dark gradient overlay) already established by the real
  business hero (`Home.css` `.capsule-banner`) — inherited, not replaced,
  per "extend an established surface."

## Banned patterns removed this pass

- Eyebrow/kicker pill above the H1 on giro landings ("EMPORIO PARA SALÓN
  DE UÑAS") — deleted; the headline itself now carries that meaning.
- Small uppercase "tag" kicker above each feature-card H3 — folded into
  the description's opening clause instead.
- Uniform icon+heading+text card grid for the 3 giro highlights — replaced
  with a plain bordered row list (no card chrome), avoiding the "same-size
  cards as page structure" default.
- Considered and rejected: numbered highlight rows (01/02/03) — the 3
  highlights per giro aren't a real sequence, so numbering them would have
  been the banned pattern for no reason.

## Motion

- Hero: capsule reveal + content fade-up on load, Ken Burns zoom + scroll
  parallax on the background image/carousel (pre-existing, kept).
- Nav: scale+shadow condense on scroll (was originally padding-based —
  fixed to `transform` after the mechanical detector flagged the
  layout-thrash risk of animating `padding`).
- Feature carousel dot indicator: was animating `width` (also flagged) —
  now a fixed-width dot scaled via `transform: scaleX()`.
- Giro highlight rows: staggered slide-in-from-left on scroll reveal.
- All motion respects `prefers-reduced-motion`.

## Known gaps / not done this pass

- No formal subagent finish-review or asset-produced comp — this session's
  browser tool could not reliably capture screenshots at any non-zero
  scroll position (confirmed via DOM/computed-style inspection that content
  renders correctly regardless; verified through `get_page_text`,
  targeted `getComputedStyle` checks, and the mechanical detector script
  instead of a scrolled screenshot). Working screenshots exist at scroll=0
  (desktop hero, mobile hero, giro-page hero) and were used for the visual
  checks that were possible.
- Contrast was checked via WCAG formula for the two CTA buttons found at
  risk (both fixed); not exhaustively re-checked pixel-by-pixel across
  every hover/translucent state.
- `SobreNosotros.jsx` (Taylor's "about us" page) and the register-form
  subtitle/back-link styling were not touched — out of scope for "las
  landing pages de registro."
