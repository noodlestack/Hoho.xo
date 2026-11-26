# Audio Asset Licenses

`Hoho.xo` renders celesta carols and chime cues natively via the Web Audio API, and optionally supports pre-recorded CC0 interface audio cues if placed in `public/audio/`.

## Optional Kenney Interface Sounds (CC0 1.0 Universal)

- **Pack**: Interface Sounds (`kenney_interface-sounds`)
- **Author**: Kenney (<https://kenney.nl>)
- **Source URL**: <https://kenney.nl/assets/interface-sounds>
- **License**: Creative Commons Zero v1.0 Universal (CC0) — no attribution required, safe for commercial and open-source use.

To swap the default Web Audio synthesizer chimes for Kenney CC0 audio files, copy three `.ogg` cues into this directory with exact filenames:

- `public/audio/drop.ogg` (ornament hang chime — e.g. `confirmation_002.ogg`)
- `public/audio/open.ogg` (note unwrap chime — e.g. `maximize_006.ogg`)
- `public/audio/qr.ogg` (QR view switch — e.g. `select_005.ogg`)

When these files are absent, `src/lib/sound.ts` caches the missing check and falls back cleanly to synthesized Web Audio celesta chimes without console errors.
