## Summary

Describe what changed and why.

## Checklist

- [ ] `pnpm lint` passes with 0 errors and 0 warnings
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test:e2e` passes (including `axe-core` accessibility & visual snapshots)
- [ ] Preserves [SECURITY.md](SECURITY.md) guarantees (no message body or sender leakage on `/t/[handle]`, no `/api/*` SW caching)
- [ ] Respects `prefers-reduced-motion` for all new motion or canvas effects
- [ ] Verified visually at `390×844`, `768×1024`, and `1440×900` (attach screenshots for UI changes)
