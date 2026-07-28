# iBuy Luxury Cars — Redesign Handoff

Static site — vanilla HTML, CSS and ES modules. No build step: open `index.html`
in a browser, or serve the folder with any static server.

## Pages
- **`index.html`** — homepage (hero → network → nationwide transport → process →
  what we buy → reviews → footer).
- **`about.html`** — About / company & founder. Reusable template for info pages.
- **`make-audi.html`** — "Sell my Audi" make page. Reusable template for the make
  pages (swap the make name, the photos and the make-specific intro).

## Structure
- **`css/`** — `tokens.css` (design tokens: colour, type, spacing, themes),
  `base.css` (reset + primitives), `sections/*` (per homepage-section styles),
  `footer3.css` (footer), `page.css` (inner-page primitives used by about/make).
- **`js/`** — `main.js` (interactions, scroll reveals), `us-map.js` + `us-map.json`
  (network map).
- **`assets/`** — images, icons, fonts.

## Conventions
- Light/dark sections alternate via `theme-light` / `theme-dark` classes; both
  are token-driven and verified for WCAG AA contrast.
- Inner pages point their nav/footer anchors back to homepage sections
  (`index.html#process`, etc.).
- Web fonts: Antonio, Inter Tight, Instrument Serif, JetBrains Mono (Google Fonts).
- All copy and photography is taken from the current ibuylc.com pages.

## Before go-live (client-supplied)
Real deal figures, Kansas City address, form + newsletter endpoint (CRM/Mailchimp),
hero video footage, vector logo.
