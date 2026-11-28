# Changelog

All notable changes to **Hoho.xo** are documented in this file following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] — 2026-11-28 · Holiday Letter Choreography, Account Login, 4K/1080p60 Exports & Playlist

### Added

- **Guided 2-Step Onboarding & Password Login**: Replaced raw hex access keys with a clean 2-step **Create My Tree / Log In** wizard (`OwnerOnboardingCard`), salted `scrypt` password hashing, multi-device HMAC `HttpOnly` sessions, zero-`409` session rehydration (`mode: "session"`), and `POST /api/auth/logout`.
- **Ornament → Holiday Envelope → Unfolding Letter Animation**: Clicking any ornament animates the glowing decoration gathering into a North Pole airmail envelope stamped with a wax seal, popping open in 3D, and sliding out warm cream stationery letter paper (`Dear <Name>,` + serif/`Caveat` toggle + replay button).
- **10-Track Browser-Sourced Christmas Playlist**: Added `ChristmasPlaylistSheet` streaming 10 public-domain & CC-BY classic holiday recordings from Wikimedia Commons (`Jingle Bells`, `Carol of the Bells`, `Silent Night`, `We Wish You a Merry Christmas`, `Deck the Halls`, `Dance of the Sugar Plum Fairy`, `O Holy Night`, `Joy to the World`, `Hark! The Herald Angels Sing`, `O Christmas Tree`) with seek bar, shuffle, repeat, volume control, and automatic Celesta Music Box offline fallback.
- **Ultra-HD (4K) PNG & Full-HD (1080p60) Video Exports**: Upgraded Story/Post/Square cards to 2× supersampled 4K (`2160×3840`, `2160×2700`, `2160×2160`), QR exports to `2400×2832` UHD, and video reels + animated letter reveals to `1080×1920` `60fps` at `16 Mbps` (`.mp4` / `.webm`) with synthesized celesta chimes.

### Fixed

- **Direct `/t/[handle]` QR Redirects & High-Contrast Scannability**: Fixed QR generation so every live plate, standalone QR PNG, and Story badge encodes an absolute `https://.../t/[handle]` URL on a high-contrast warm ivory quiet-zone plate (`ECC-H`) for instant camera scanning.
- **Next.js 16 Pre-Render 404 Guard (`src/proxy.ts`)**: Nonexistent or invalid `/t/[handle]` routes now return genuine HTTP `404` status codes instead of streaming `200` soft-404s.
- **QA Polish**: Fixed stale reload prompt (`SplitText` DOM mutation), masked `Wrap Dec 25` previews in `MailDrawer`, bound `Escape` to close Mail, added scroll chevrons to `OrnamentPickerStrip`, upgraded UI typography to `Figtree` (`>= 16px` mobile inputs), and added per-tree OpenGraph/Twitter metadata.

## [0.1.0] — Initial Release · 3D ASCII Tree, Jewel Ornaments & Privacy Hardening

- Volumetric 3D ASCII Christmas tree canvas (`AsciiTreeCanvas`), 16 vector jewel ornament sprites, 10 color themes, private `HttpOnly` Mail inbox, 6 Story templates, PWA offline fallback, and VAPID Web Push notifications.
