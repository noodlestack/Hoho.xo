# Contributing to Hoho.xo

Thank you for helping improve **Hoho.xo**! Every change must preserve visitor anonymity, owner session isolation, smooth 60fps canvas performance, and accessible mobile-first UI.

## Local Setup

Requires **Node.js 24+** (see `.nvmrc`) and **pnpm**:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Visit `http://localhost:3000` for Owner Studio and `/t/<handle>` for the public visitor view. Local development automatically uses an atomic JSON file store when Upstash Redis credentials are unset.

## Required Checks Before Opening a PR

All pull requests are validated by GitHub Actions (`.github/workflows/ci.yml`):

```bash
pnpm lint       # ESLint 9 + jsx-a11y + React Compiler rules (0 warnings)
pnpm typecheck  # TypeScript tsc --noEmit
pnpm test       # Vitest unit & API integration suite
pnpm build      # Next.js 16 production build
pnpm test:e2e   # Playwright end-to-end, axe-core a11y & visual snapshots
pnpm lhci       # Lighthouse CI performance, a11y & best-practices budgets
```

Keep source files focused and modular (target `< 600` lines per module). When adding styles, update the appropriate ordered partial under `src/app/styles/`.

## Non-Negotiable Architecture Rules

1. **Anonymity & Privacy ([SECURITY.md](SECURITY.md))**:
   - Visitors on `/t/[handle]` never see message text, read/starred/replied flags, muted words, or sender metadata.
   - Owner mail and config mutations stay behind the `HttpOnly` cookie (`__Host-` in production) and same-origin checks.
   - Service Worker (`public/sw.js`) must never cache `/api/*` responses.
2. **Optional Support Only**:
   - Support / Ko-fi / Sponsor links live exclusively in Owner Studio (`SupportSheet`), never on `/t/[handle]`.
   - Reading notes, themes, Story cards, and Web Push alerts remain 100% free and ungated.
3. **Self-Hosted Runtime CSP**:
   - All canvas fonts (`next/font`), jewel ornament vector sprites (`src/lib/ornament-sprites.ts`), audio synths, and UI assets run without external runtime CDNs.
4. **Motion Accessibility**:
   - Every GSAP, CSS, and canvas animation must honor `prefers-reduced-motion` and `?static=1`.
