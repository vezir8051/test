# Cafe One

A single-page marketing site for **Cafe One**, a specialty coffee bar. Static
HTML, CSS, and a small progressive-enhancement script. No build step.

## Run it

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8099   # then visit http://localhost:8099
```

## Stack and decisions

- **Vanilla HTML/CSS/JS**, no framework, no build.
- **Fonts self-hosted** in `fonts/` (Bricolage Grotesque for display, Hanken
  Grotesk for body). Both are variable woff2 files, preloaded.
- **Palette:** Olive + Brick + Paper, light-mode locked. One accent (brick)
  used across the whole page; one corner-radius system (sharp).
- **Photography:** Unsplash CDN URLs sized per slot.
- **Motion:** scroll-reveal and the sticky-header state run on
  `IntersectionObserver` only (no scroll listeners), and everything collapses
  to static under `prefers-reduced-motion: reduce`.

## Structure

```
cafe-one/
  index.html        markup for all sections
  css/styles.css    full stylesheet
  js/main.js        header state, scroll reveal, mobile menu, footer year
  fonts/            self-hosted woff2 files
  favicon.svg
```

## Sections

Hero, statement, sourcing (bento), menu, gallery, visit, footer. Each section
uses a distinct layout family.
