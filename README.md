<div align="center">

# Hoho.xo

**Your bio link as a luminous 3D ASCII Christmas tree & scannable QR card.**

*made by [noodlestack](https://github.com/noodlestack)*

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F5C451?style=flat-square)](LICENSE)

</div>

---

![Hoho.xo Preview](docs/preview.png)

**Hoho.xo** turns your personal bio link into an interactive 3D ASCII Christmas tree and a razor-clean, scannable dark-canvas QR code. Share your link or QR on Instagram Stories, X, or WhatsApp—friends scan or open `/t/[handle]` with zero sign-in to hang anonymous holiday notes as glowing ornaments on your tree.

---

## Features

- **Strict Owner vs. Visitor Isolation (`/` vs. `/t/[handle]`)**
  - **Owner Studio (`/`)**: Protected by an `HttpOnly` session cookie (`__Host-` prefixed in production) with same-origin checks—the **Owner Access Key** is shown **once** at claim time for cross-device recovery and is never stored in `localStorage`. Features a 3-tab Creator Studio (**Share**, **Style**, **Prompt**), one-tap `"Unwrap newest unread"` spotlight, lightweight Mail summary polling, and `.txt` keepsake archive exports.
  - **Visitor Bio Link (`/t/[handle]`)**: SSR-hydrated anonymous compose experience showing only sanitized ornament positions—never message bodies, read status, hidden word lists, or owner controls—with `sessionStorage` draft auto-save, `Ctrl/Cmd+Enter` quick send, character progress bar, and celebratory confetti.
- **3D ASCII Tree & Tap-to-QR Morphing**
  - Hardware-friendly 2D canvas projection (~6,600 adaptive points on desktop, tuned density on mobile) with a cached radial glow sprite, `IntersectionObserver` off-screen frame pausing, and 2-finger pinch-to-zoom.
  - Tapping empty sky, the footer pill, or pressing `Q` smoothly fades atmospheric effects and morphs the tree into a scannable QR code wrapped in a strict 4-module quiet zone linking directly to `/t/[handle]`.
- **Deep Customization & Holiday Atmosphere**
  - **10 Color Themes** (`Classic`, `Fairy`, `Pine`, `Snow`, `Midnight`, `Blush`, `Aurora`, `Silver`, `Ember`, `Mint`).
  - **6 Tree Toppers** (`Star`, `Sparkle`, `Snowflake`, `Heart`, `Crown`, `Bow`) & **4 Silhouettes** (`Classic`, `Slim`, `Bonsai`, `Full`).
  - **5 Animated Winter Sceneries** (`Snowfall`, `Aurora`, `Starlight`, `Blizzard`, `Hearth`).
  - **16 Ornament Styles** (the newest **100** visible notes decorate the 3D tree, while **Mail** retains the complete archive).
- **Web Audio Christmas Music Box**
  - Built-in synthesized celesta music box featuring 4 holiday carols (`Play`/`Pause`/`Next Carol`) plus soft interactive chimes—strictly opt-in via user gesture.
- **Private Mail Archive & `1080×1920` Story Cards**
  - Accessible Vaul slide-over Mail drawer & swipe-to-dismiss note sheets with Search, `All`/`Unread`/`Reported` filters, `Mark all read`, `Wrap Dec 25` lock mode, and `1080×1920` IG Story PNG exports across 4 vibes (`Night`, `Pine`, `Ember`, `Blush`).
  - Dynamic `1200×630` OpenGraph social cards generated via `next/og` for both `/` and `/t/[handle]`.
- **Security, Moderation & Fail-Closed Rate Limits**
  - Strict `zod` schema validation, `Idempotency-Key` replay deduplication, per-tree message capacity cap (`1000` default), and `Origin`/`Referer` + `Content-Type` enforcement on owner-authenticated mutations.
  - Upstash Redis sliding-window rate limits (`@upstash/ratelimit`) with salted HMAC-SHA256 client IP hashing (`HOHO_IP_SALT`, trusted proxy header extraction via `HOHO_TRUSTED_PROXY`): `20/10m` global per-IP cap, `200/hr` per-handle cap, `6/min` and `30/hr` per-IP + handle, and `20/hr` production claim limit. **Fails closed (`503`)** when Upstash KV errors/times out in production.
  - Honeypot trap, `Pause inbox` toggle, one-click report/delete, local `classifyMessage` filtering (URLs, emails, phone numbers without blocking holiday dates, owner-muted words, maintainer lexicon `EXTRA_BLOCKED_TERMS`, optional opt-in OpenAI moderation), and non-blocking crisis support guidance.
  - Security headers (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).

---

## Architecture

```mermaid
flowchart LR
  V["Visitor /t/[handle]"] -->|SSR Hydration| Page["Next.js App Router"]
  O["Owner Studio /"] -->|HttpOnly Cookie| API["/api/trees/** + Zod"]
  V -->|POST /messages| API
  API --> Store["Server Store (Upstash KV / Atomic JSON)"]
  Page --> OG["next/og Dynamic PNG (1200x630)"]
  Page --> Canvas["AsciiTreeCanvas (3D Tree <-> Scannable QR)"]
```

---

## Keyboard & Gesture Controls

| Control | Action |
| :--- | :--- |
| `Q` | Toggle between 3D Tree and scannable QR view |
| `T` | Toggle top-down tree view |
| `M` | Open / close private Mail drawer *(Owner mode)* |
| `N` | Focus anonymous note composer *(Visitor mode)* |
| `ArrowLeft` / `ArrowRight` | Rotate 3D tree horizontally |
| `Ctrl+Enter` / `Cmd+Enter` | Submit anonymous note from composer |
| `?` | Toggle keyboard shortcuts popover *(Desktop)* |
| `Drag` / `Scroll` / `Pinch` | Orbit, wheel-zoom, or 2-finger pinch-zoom tree |

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework & Routing | Next.js 16 (`App Router`, `standalone` output) + React 19 + TypeScript 6 |
| Styling & UI Primitives | Tailwind CSS v4, `lucide-react`, `vaul`, `sonner`, `canvas-confetti` |
| Validation & QR | `zod` v4, `qrcode` |
| Canvas, Audio & Exports | HTML5 2D Canvas (`IntersectionObserver` + glow cache), Web Audio API, `next/og` |
| Storage & Limits | `@upstash/redis` & `@upstash/ratelimit` (`hoho:v2:*`), Atomic JSON file (`file`), Memory fallback |
| Testing & Tooling | Vitest 5, ESLint 9, TypeScript compiler (`tsc --noEmit`), `pnpm` |

---

## Quick Start

Requires **Node.js 24+** and **pnpm**:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

- **Owner Hub**: `http://localhost:3000`
- **Public Visitor Page**: `http://localhost:3000/t/<your-handle>` *(after claiming a handle in Owner Studio)*
- **Health Check**: `http://localhost:3000/api/health`

## Verification

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## Deployment

### Vercel (+ Upstash Redis / Vercel KV — Required)

> **Important:** **Vercel requires Upstash Redis / Vercel KV** (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Without KV on Vercel in production, tree claims and note submissions return `503` (`Storage is not configured.`) and `/api/health` returns `503` (`durable: false`) rather than silently falling back to ephemeral instance memory.

1. Push this repository to GitHub and import into Vercel (`pnpm build`, Node 24+).
2. Set `NEXT_PUBLIC_SITE_URL`, `HOHO_IP_SALT`, `HOHO_TRUSTED_PROXY=vercel`, and connect an **Upstash Redis** / **Vercel KV** database (see [.env.example](.env.example)).
3. Deploy—`/api/health` will report `"storage": "kv"` and `"durable": true`, CSP/HSTS headers are active in [next.config.ts](next.config.ts), and `HttpOnly` `__Host-` owner cookies authenticate Owner Studio and Mail.

### Docker Standalone

```powershell
pnpm build
docker build -t hoho-xo .
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=https://your-domain.com -v hoho_data:/app/.data hoho-xo
```

The container pre-creates `/app/.data` owned by `nextjs:nodejs` (configurable via `HOHO_STORE_FILE`) and includes a built-in `HEALTHCHECK` targeting `/api/health`.

### Environment Variables

| Variable | Required | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Recommended | `http://localhost:3000` (dev) | Canonical origin for metadata, OG cards, and same-origin checks |
| `HOHO_IP_SALT` | Yes (prod) | Dev fallback in non-prod | Secret salt for HMAC-SHA256 rate-limit IP hashing |
| `HOHO_TRUSTED_PROXY` | Recommended | `none` | Client IP header source: `vercel`, `cloudflare`, or `none` |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Yes on Vercel | — | Upstash Redis REST credentials (also accepts `KV_REST_API_*`) |
| `HOHO_REQUIRE_DURABLE` | Optional | Unset | Set `1` in production to return `503` if KV is unconfigured |
| `HOHO_STORE_FILE` | Optional | `.data/hoho-store.json` | Custom JSON store path for self-hosted file mode |
| `HOHO_MAX_MESSAGES_PER_TREE` | Optional | `1000` | Maximum stored notes per tree before returning `429` |
| `HOHO_GLOBAL_MSG_LIMIT` | Optional | `20` | Global per-IP message submissions allowed per 10 minutes |
| `HOHO_HANDLE_HOURLY_LIMIT` | Optional | `200` | Total notes allowed per tree per hour |
| `HOHO_MODERATION_PROVIDER` | Optional | Off | Set `openai` with `OPENAI_API_KEY` for optional `omni-moderation-latest` check |
| `OPENAI_API_KEY` | Optional | — | API key used only when `HOHO_MODERATION_PROVIDER=openai` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_*` | Optional | Off | VAPID public/private keys & subject (`mailto:...`) enabling owner Web Push alerts |

---

## License

Released under the [MIT License](LICENSE). Built by [noodlestack](https://github.com/noodlestack).
