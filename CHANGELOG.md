# Changelog

All notable changes to **Hoho.xo** are documented in this file following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — Polish, Motion & Hardening

### Added
- **3D Tree Volumetric Rendering**: Orbiting 24s Lambert light shading, single-hue glyph luminance ramps, sparse lights (`<= 7%`), continuous helical garland, gentle height-dependent wind sway, elliptical ground glow, and larger optical framing.
- **Jewel Ornaments & Arrival Physics**: High-contrast backing disks, top-left specular dots, hover focus rings, smooth 120ms tooltips, `-120px` arrival drop bounce + landing flash, 2.2s `±7°` hanger pendulum swing, and live unread pill tick animations.
- **GSAP Choreography & Radial QR Morph**: Skippable 1.4s bottom-to-top tree grow timeline (`gsap`), `SplitText` prompt reveal, stat count-ups, and `<= 1.2s` radial centre-out QR morph waves (`power2.inOut`).
- **Visitor Loop & Story Templates**: 6 Taglish/Filipino prompt presets, GSAP flying ornament send-arc, send haptics (`navigator.vibrate`), `"Get your own tree →"` celebration hero CTA, and `InviteStorySheet` with 3 `1080×1920` Story invite templates (`QR Forward`, `Big Prompt`, `Minimal`) plus Web Share API fallback.
- **Owner Web Push (`after()` Coalescing)**: `/api/trees/[handle]/push` (`GET`/`POST`/`DELETE`), `public/sw.js`, 5-device cap, 1/min coalescing, generic privacy-preserving notifications, and iOS standalone guidance.
- **Mobile Vaul Bottom Sheet & PWA Assets**: Draggable bottom sheet below `768px` leaving `>= 58%` viewport height for the tree, plus crisp `192×192`, `512×512`, and `180×180` raster PWA icons and `public/audio/LICENSES.md` CC0 buffer loader.
- **Repository Presentation**: Banner (`1600×600`), social preview (`1280×640`), `1280×800` hero `demo.gif`/`demo.mp4`, updated desktop/mobile screenshots, `SECURITY.md`, and `docs/presentation.md`.

### Security & Hardening
- Replaced permissive handle fallback with strict 3–20 char `parseHandle` validation and 404/reject behavior on reserved or invalid handles.
- Replaced monolithic read-modify-write storage with atomic store adapters (`KvTreeStore` on `hoho:v2:*`, mutex-guarded `FileTreeStore`, and `MemoryTreeStore`) preventing concurrent lost updates and claim races.
- Added fail-closed (`503`) Upstash sliding-window rate limiting with HMAC-SHA256 IP hashing (`HOHO_IP_SALT`, `HOHO_TRUSTED_PROXY`), `Idempotency-Key` deduplication, strict `__Host-` `HttpOnly` owner cookies (never stored in `localStorage`), same-origin CSRF checks (`Origin`/`Referer`), and tightened `next.config.ts` CSP/HSTS headers.

### Accessibility & Contrast
- Verified WCAG AA contrast (`--text-dim` 8.57:1, `--text-faint` 6.46:1 on `--bg-surface`), keyboard focus rings, Vaul Escape/focus handling, canvas `aria-label`, and `prefers-reduced-motion` across all animations.
