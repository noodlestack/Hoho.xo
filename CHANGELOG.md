# Changelog

All notable changes to **Hoho.xo** are documented in this file following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — Polish, Craft, Accessibility & QA Hardening

### Added

- **Vector Jewel Ornaments & 5-Point Star Topper**: Pre-rendered DPR-aware jewel ornament sprites (`src/lib/ornament-sprites.ts`) with `<OrnamentSpriteIcon />` UI thumbnails, `>= 24px` touch hit targets, and a glowing 5-point vector star topper with optional cosmetic Golden Star Supporter halo.
- **Classic Palette & Adaptive Canvas Rendering**: Switched default palette to high-contrast Classic pine + warm gold + midnight, blue-noise Fibonacci foliage (`>= 85%` density), 120 atmosphere particles, and automatic quality-tier stepping (`high` → `medium` → `low`) with `?debug=1` HUD.
- **Mail Inbox Filters, Handwriting & Swipe Deck**: Added 5 filter tabs (`All / Unread / Replied / Starred / Reported`), persisted `starred` and `repliedAt` flags, `Caveat` handwriting card toggle, GSAP `Flip` unwrap transition, pointer swipe deck navigation, and visibility-aware polling backoff.
- **Expanded Story Studio**: Added 6 templates (`QR Forward`, `Big Prompt`, `Minimal`, `Polaroid`, `Receipt`, `Sticker`) across `9:16`, `4:5`, and `1:1` formats, Instagram Safe Zone overlay toggle, link-in-bio guide, and 3-second `.webm` Reel clip export.
- **Ethical Owner Support Dialog**: Added optional Owner Studio `SupportSheet` (zero presence on `/t/[handle]`, zero message paywalls) with strict HTTPS link allowlisting and timing-safe `HOHO_SUPPORTER_CODES` unlock flow.
- **PWA Offline Experience & QA Suite**: Added `public/offline.html`, static/push-only `public/sw.js` bypassing `/api/*`, Playwright E2E + `axe-core` accessibility + visual snapshot tests, ESLint `jsx-a11y`, Lighthouse CI budgets, `.nvmrc`, `CONTRIBUTING.md`, and GitHub issue/PR templates.

### Changed

- **Modular Architecture (< 600 Lines)**: Split monolithic `globals.css`, `ascii-tree-canvas.tsx`, and `hoho-experience.tsx` into ordered partials under `src/app/styles/`, canvas renderers under `src/components/tree/`, and hooks/panels under `src/components/hoho/`.
- **Exact Dependency Pins**: Pinned runtime and dev dependencies cleanly with verified `pnpm install --frozen-lockfile`.

### Security & Privacy

- Preserved strict visitor anonymity on SSR `/t/[handle]` and `GET /api/trees/[handle]`: zero message bodies, read/starred/replied flags, muted words, or sender metadata are ever exposed.
- Enforced `HttpOnly` `__Host-` owner cookies, same-origin CSRF checks, fail-closed (`503`) Upstash KV rate limits, and static-only Service Worker caching (never caching `/api/*`).
