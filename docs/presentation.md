# Repository Presentation & Demo Guide

## Demo Recording Workflow (`docs/assets/demo.gif` & `demo.mp4`)

Captured cleanly at `1280×800` against a freshly initialized tree (`@holiday_tree`) with sample festive ornaments:

1. **Grow Choreography (1.4s)**: Bottom-to-top GSAP foliage reveal, spiral garland trace, sparse lights twinkle, and apex star pop.
2. **Owner Studio & Live Palette Morph**: Share tab (`hoho.xo/t/holiday_tree` masked cleanly with zero `localhost`) -> Style tab toggling `Fairy` -> `Classic`.
3. **Radial-Wave QR Morph**: `Q` / `QR Code` mode unfolding into a strict 4-module quiet-zone QR code, then peeling back cleanly to 3D Tree mode.

Encoding parameters (`ffmpeg`):
- `demo.mp4`: `libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart`
- `demo.gif`: 2-pass `palettegen` / `paletteuse` at `fps=12,scale=960:-1` (verified `< 6 MB`).

## GitHub Repository Settings Checklist (`R7`)

Once pushed to `main`, finish these one-time GitHub UI settings on **noodlestack/Hoho.xo**:

- [ ] **Social Preview**: Repository *Settings -> General -> Social preview -> Upload an image...* -> upload [`docs/assets/social-preview.png`](assets/social-preview.png) (`1280×640`).
- [ ] **About Description**: *"Your bio link, as a luminous 3D ASCII Christmas tree & scannable QR code for anonymous notes."*
- [ ] **Website**: Your deployed Vercel or custom domain URL.
- [ ] **Topics**: `nextjs`, `react`, `typescript`, `ascii-art`, `qr-code`, `christmas`, `anonymous-messages`, `canvas`, `tailwindcss`, `upstash`
- [ ] **Features**: Keep Issues/Discussions enabled as desired; Projects/Wiki optional.
- [ ] **Security Advisories**: Enable Private Vulnerability Reporting under *Settings -> Code security and analysis* (paired with [`SECURITY.md`](../SECURITY.md)).
