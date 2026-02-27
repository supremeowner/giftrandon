# Changes (requested)
## Colors
- Global background: **#1C1C1E**
- Gift cards (icons): **#2C2C2E** via `--app-card`
## Bottom tab bar
- Active tab no longer fills the whole button; only icon+text become blue (#007AFF).
- SVG <img> recolored using CSS filter for active state.
## Star icon + price layout
- Replaced StarIcon component with repository SVG: `src/assets/gifts/star-badge.svg`
- Price in gift cards centered, star moved closer to digits.
## Top star selection tabs
- Tabs height increased slightly.
- Active background set to **rgba(44,44,46,0.6)** (i.e., #2C2C2E 60%).

## Quick Gift matching
- Header background set to #1C1C1E.
- Top star tabs centered and pill-shaped.
- Roulette gift cards made shorter.
- Bottom tab bar container/buttons reduced.

## Latest request
- Tabs: no background container; active only.
- setHeaderColor('#1C1C1E') safe call.
- Bottom tabbar: rgba(30,30,30,0.75) + blur(100px).
- Cards: #2C2C2E.
- Star icons unified to star-badge.svg and sized 1em.

## Telegram header + RGBA colors
- setHeaderColor('#1C1C1E') (rgba(28,28,30,1)).
- Gift cards: rgba(44,44,46,1).
- Bottom tabbar: rgba(30,30,30,0.75) + blur(100px).
- Gift card star+price badge centered with star-badge.svg.
