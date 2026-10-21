# Infra by Shan

一步一步看懂 AI 数据基础设施。Step-by-step animated explainers for AI data infrastructure.

Personal learning notes by Lin Shan. Not affiliated with, or endorsed by, any vendor mentioned.

## Structure

- `index.html` - home: layer map (compute / network / storage / data and AI software) with vendor filter
- `vast/`, `ddn/`, `nvidia/` - track pages: one vendor, cards in presales order
- `cards/<track>/<slug>/` - one card = one question, 5 to 7 animated steps
- `talks/<slug>/` - a talk = an ordered list of cards, played in present mode
- `assets/` - shared stepper engine and styles

Every card has two modes: read (web) and present (press `P` or add `?present`).

## Rules

- Content comes only from public vendor documentation; each card cites its sources.
- No vendor logos or official color schemes.
- Static HTML, SVG and JS. No framework, no build step.
- Hosted on GitHub Pages: https://infra-by-shan.github.io (noindex until reviewed).
