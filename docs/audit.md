# Hoho.xo — Phase 0 Audit Report

**Audit Date:** 2026-11-26  
**Scope:** Baseline visual, responsive, accessibility, performance, FPS, console/network, and production health audit prior to code changes.  
**Targets Audited:**

- Production: `https://hoho-xo.vercel.app/` and `https://hoho-xo.vercel.app/t/test`
- Local Dev Server: `http://localhost:3000/` and `http://localhost:3000/t/audit_tree_pfn0` (temporary handle created during audit and deleted from Upstash Redis immediately afterward)

---

## 1. Production Health & End-to-End Persistence

Verified `GET https://hoho-xo.vercel.app/api/health`:

```json
{
  "ok": true,
  "storage": "kv",
  "durable": true,
  "siteUrlConfigured": true,
  "timestamp": "2026-11-26T08:07:00.050Z"
}
```

- **Status:** HTTP `200`
- **KV Backend:** Connected (`storage: "kv"`, `durable: true`)
- **Tree claim & anonymous note flow:** End-to-end claim (`POST /api/trees`), QR view, visitor note submission (`POST /api/trees/[handle]/messages`), and celebration state all worked during the Playwright walkthrough (`audit-celebrate-390.png`, `audit-celebrate-1440.png`).

---

## 2. Mobile Lighthouse Scores & Core Vitals

Measured with Lighthouse mobile emulation (`4×` CPU slowdown + simulated mobile network throttling):

| Page                                     | Perf | A11y | Best Practices | SEO |   FCP |   LCP |      TBT | CLS | Speed Index |
| ---------------------------------------- | ---: | ---: | -------------: | --: | ----: | ----: | -------: | --: | ----------: |
| Production Home (`/`)                    |   87 |  100 |            100 |  63 | 1.0 s | 1.0 s |   520 ms |   0 |       1.9 s |
| Production Missing Tree (`/t/test`)      |   84 |  100 |            100 |  54 | 1.0 s | 2.7 s |   460 ms |   0 |       3.4 s |
| Local Dev Studio (`/`)                   |   75 |  100 |            100 |  63 | 0.8 s | 0.8 s | 1,110 ms |   0 |       4.3 s |
| Local Dev Visitor (`/t/audit_tree_pfn0`) |   44 |  100 |            100 |  63 | 0.9 s | 8.7 s | 2,200 ms |   0 |       4.8 s |

### Top Failing Lighthouse Audits (Production)

- **`total-blocking-time` (520 ms / 460 ms)** & **`max-potential-fid` (230 ms / 210 ms)**: Canvas initialization + GSAP + hydration run synchronously on load, delaying main-thread interactivity on mobile.
- **`mainthread-work-breakdown` (6.7 s / 7.8 s)** & **`bootup-time` (2.5 s / 3.0 s)**: Heavy per-frame JS work on canvas and studio hydration.
- **`forced-reflow-insight` (score 0)**: Layout read/write interleaving triggered during mount/resize.
- **`bf-cache` (score 0 on `/t/test` and local routes, 2–3 failure reasons)**: Prevents instant back/forward navigation restoration.
- **`is-crawlable` (score 0, SEO 63 / 54)** & **`meta-description` missing on `/t/test`**: Indexing directives and missing description lower SEO score.
- **`unused-javascript` (23–26 KiB prod)** & **`unused-css-rules` (10–11 KiB prod)**.

---

## 3. Canvas Frame Rate (4× CPU Throttled, Chrome DevTools CDP)

Target: **50+ fps** (`<= 20.0 ms` avg frame time) under `Emulation.setCPUThrottlingRate({ rate: 4 })`.

| Scenario                  | Avg Frame Time | Measured FPS | Worst Frame | Meets 50+ FPS Target?             |
| ------------------------- | -------------: | -----------: | ----------: | --------------------------------- |
| Owner Studio (`390×844`)  |       21.56 ms |     46.4 fps |     34.8 ms | **No** (-3.6 fps)                 |
| Owner Studio (`1440×900`) |       29.35 ms |     34.1 fps |     55.3 ms | **No** (-15.9 fps, worst > 50 ms) |

Root causes observed: continuous per-frame glyph rendering / `measureText` calls across large DPR canvases without adaptive FPS quality tiering or static pre-baked caches (`?static=1` / reduced-motion idle throttling).

---

## 4. Contrast, Typography, & Touch Target Measurements

### Text Contrast (WCAG AA)

Measured foreground-to-background contrast ratios across primary labels and controls ranged from **6.91:1 to 15.48:1**, passing WCAG AA (4.5:1 normal / 3:1 large).

### Small Text (< 12 px) & Input Font Sizes (< 16 px)

- **Inputs < 16 px (triggers iOS Safari auto-zoom on focus):**
  - `owner-handle-input`: `11.52 px`
  - `owner-name-input`: `12.80 px`
  - `owner-prompt-input`: `12.80 px`
  - `owner-muted-words`: `12.80 px`
  - `owner-unlock-key`: `11.52 px`
- **Labels < 12 px:**
  - `.section-label`: `11.00 px`
  - `.credit-badge`: `10.24 px`
  - `.bio-handle-line`: `10.88 px`
  - `.countdown-pill`: `10.88 px`
  - `.tree-meta-line`: `11.36 px`

### Touch Targets Under 44×44 px

- **Mobile (`390×844`):**
  - `.brand` (`97.5×36 px`)
  - `.view-tab` (`118×32 px`)
  - `.audio-pill-btn` (`38×36 px`)
  - `Mail` button (`86.6×36 px`)
  - `Tap tree for QR` pill (`139.3×38 px`)
  - `.studio-tab` (`115.3×36 px`)
- **Tablet & Desktop (`768×1024` / `1440×900`):**
  - `.zoom-btn` (`30×30 px`)
  - `.shortcuts-btn` (`34×34 px`)
  - `.share-copy-icon-btn` (`34×34 px`)
  - Avatar emblem buttons (`38×38 px`)
  - `"Open Handle & Access Key →"` (`178×28 px`)
  - Footer links (`Privacy`, `Terms`, `noodlestack`: `16.5 px` height)

---

## 5. Prioritized Issues Table

| #   | Where                                                                                                | What's wrong                                                                                                                                                                                                                                                                                                                                                | Severity | Proposed fix (Phase)                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `src/components/ascii-tree-canvas.tsx`                                                               | 4× CPU-throttled FPS drops to `46.4 fps` (`390×844`) and `34.1 fps` (`1440×900`, worst `55.3 ms`), failing the `50+ fps` mobile target; production TBT is `460–520 ms`.                                                                                                                                                                                     | **P0**   | Add adaptive quality tiering on frame-time spikes, memoize glyph metrics/`measureText`, reduce offscreen allocations, and support `?static=1` & visibility/reduced-motion pausing (Phase 1 & Phase 3). |
| 2   | `src/hooks/use-owner-session.ts` / `hoho-experience.tsx`                                             | Reloading `/` when `localStorage` holds an already-claimed handle fires a spurious `POST /api/trees` (`409 Conflict` × 6 console/network errors), drops `serverSynced` to `false`, appends `?tree=fairy` to the share link, and displays the "already claimed" error banner instead of rehydrating via the existing `HttpOnly` cookie session (`Mail (0)`). | **P0**   | Check existing session before claiming; confirm auth/cookie hydration design before editing (Phase 1 / Auth review).                                                                                   |
| 3   | Header navigation at `200%` browser zoom (`audit-zoom-200.png`)                                      | At `200%` zoom on `1440×900` (`720 px` effective width), the centered `.view-tabs` collides horizontally with `.brand`, clipping `Hoho.xo` behind the `Tree` tab.                                                                                                                                                                                           | **P1**   | Replace fixed-center collision positioning with responsive flex spacing / compact mobile pills at narrow & zoomed viewports (Phase 5).                                                                 |
| 4   | Tablet portrait (`768×1024`, `audit-studio-768.png`)                                                 | Vaul bottom sheet turns off at `768 px` while `@media (max-width: 860px)` stacks panels vertically, leaving the tree stage at `42%` height and stretching `.social-card` full width (`768 px`).                                                                                                                                                             | **P1**   | Refine breakpoints (`<= 860 px` / tablet layout) so the tree retains hero proportions and controls stay ergonomic in portrait/landscape tablet sizes (Phase 5).                                        |
| 5   | All interactive controls on mobile & tablet                                                          | Multiple header buttons, tabs, zoom controls, copy button, emblems, and footer links measure `< 44×44 px` (down to `30×30 px` and `28 px` height).                                                                                                                                                                                                          | **P1**   | Enforce `min-height: 44px; min-width: 44px` hit areas (or invisible `::after` tap padding) for all buttons, tabs, and links on touch/coarse pointers and small viewports (Phase 1 / Phase 5).          |
| 6   | Form inputs & micro-labels (`globals.css`, `hoho-experience.tsx`)                                    | Owner inputs (`11.52–12.8 px`) are `< 16 px` (triggering iOS Safari zoom), and five label classes sit at `10.24–11.36 px`.                                                                                                                                                                                                                                  | **P1**   | Raise all `input`/`textarea` font sizes to `>= 16 px` (`1rem`) on mobile/touch viewports and set minimum label size to `12 px` (`0.75rem`) (Phase 2 / Phase 5).                                        |
| 7   | Mobile visitor Vaul drawer (`audit-visitor-390-open.png`)                                            | Opening the sheet heavily blurs/dims the entire tree backdrop, hides prompt/avatar context and character counter, and lacks `visualViewport` keyboard offset handling for iOS Safari.                                                                                                                                                                       | **P1**   | Compact Vaul sheet styling, preserve clear tree visibility above the sheet, add live `0/500` counter + `visualViewport` resize padding, and smooth keyboard entry (Phase 5 & Phase 6).                 |
| 8   | `/t/[handle]` metadata & crawlability (Lighthouse SEO `54–63`)                                       | Missing per-handle meta description on missing/dynamic visitor routes and `is-crawlable` failure reduce Lighthouse SEO score.                                                                                                                                                                                                                               | **P1**   | Add proper `meta description`, `generateMetadata`, canonical URLs, and check `robots` directives during metadata/SEO pass (Phase 9).                                                                   |
| 9   | Visual hierarchy, tree silhouette, & copy consistency (`audit-live-1440.png`, `audit-mail-1440.png`) | Foliage and lights share high saturation without layered lighting; `.share-link-pill` truncates `localhost` URLs awkwardly; Mail empty state mixes Tagalog (`Wala pang ornament...`) with English subtitle.                                                                                                                                                 | **P2**   | Consolidate color/typography tokens (Fraunces + Inter + JetBrains Mono), add depth-graded tree lighting & ornament glow, clean share link formatting, and unify copy (Phase 2, Phase 3, Phase 6).      |

---

## 6. Screenshot Evidence Index (`docs/audit/`)

- **Owner Studio across viewports:**
  - `docs/audit/audit-studio-360.png`, `docs/audit/audit-studio-360-open.png`
  - `docs/audit/audit-studio-390.png`, `docs/audit/audit-studio-390-open.png`
  - `docs/audit/audit-studio-768.png`, `docs/audit/audit-studio-1024.png`
  - `docs/audit/audit-studio-1440.png`, `docs/audit/audit-studio-1920.png`
  - `docs/audit/audit-live-1440.png` (Production `/` capture)
- **QR Mode & Mail Drawer:**
  - `docs/audit/audit-qr-390.png`, `docs/audit/audit-qr-768.png`, `docs/audit/audit-qr-1440.png`
  - `docs/audit/audit-mail-390.png`, `docs/audit/audit-mail-768.png`, `docs/audit/audit-mail-1440.png`
- **Visitor Flow (`/t/audit_tree_pfn0`) & Celebration:**
  - `docs/audit/audit-visitor-360.png`
  - `docs/audit/audit-visitor-390.png`, `docs/audit/audit-visitor-390-open.png`
  - `docs/audit/audit-visitor-768.png`, `docs/audit/audit-visitor-1440.png`, `docs/audit/audit-visitor-1920.png`
  - `docs/audit/audit-celebrate-390.png`, `docs/audit/audit-celebrate-1440.png`
- **Browser Zoom (`150%` & `200%` on `1440×900`):**
  - `docs/audit/audit-zoom-150.png`
  - `docs/audit/audit-zoom-200.png`
