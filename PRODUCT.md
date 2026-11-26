# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tree owners share a personal link or QR code through social media and want a safe, memorable way to receive anonymous messages. Visitors open those links on mobile and want to leave a message without creating an account.

## Product Purpose

Hoho.xo gives each owner a shareable Christmas tree where each accepted, real message can appear as an ornament. Owners open an ornament to read its message and can access every retained message in a private Mail archive. Success means the experience is delightful to share and trustworthy enough to use without fake engagement or identity-reveal promises.

## Positioning

The tree is a visual inbox: a message becomes a decoration, while the private Mail archive remains the complete, accessible source of truth. Messages are anonymous to the owner, not necessarily to the service or its infrastructure providers.

## Operating Context

Most visitors arrive from social posts, chats, QR scans, or in-app browsers on a phone. Owners share a public tree link; senders submit without an account; owners authenticate to read and manage messages. The QR-to-tree transformation and selectable ornaments are the signature experience.

## Capabilities and Constraints

- Intended first-release audience is 13+, as stated in the supplied master specification. A qualified child-safety and privacy/legal review is a production launch blocker; until then, builds are private prototypes only.
- The public tree exposes ornament metadata, never message text, read state, or sender fingerprints.
- Only authentic accepted messages create ornaments. No seeded production messages, fake notifications, or generated engagement.
- The tree shows a limited recent set; the owner's private Mail is the archive.
- No sender-identity reveal, sender hints, sender analytics, or paid identity features.
- Reporting, blocking, moderation, rate limiting, deletion, and honest privacy disclosures are required before public launch.
- Use a modular web application and a static, accessible tree fallback. Treat 3D and QR animation as progressive enhancement.
- Hoho.xo is a working product name, not a cleared trademark or domain.
- Provider accounts, deployment region, budget, final age policy, retention operations, and legal approvals remain unverified or undecided.

## Brand Commitments

The supplied references establish the QR-to-Christmas-tree interaction and a text-built/ASCII tree as core inspiration. Build original visuals, code, copy, and assets; do not copy the referenced service's implementation or branding. The interface should feel intentional and crafted rather than like a generic anonymous-message dashboard.

## Evidence on Hand

- `Hoho.xo_Master_Build_Spec_v3.1.docx`
- The attached conversation describing the product idea and reference links.
- Public reference page: https://xmasqr.vercel.app/?tree=fairy
- Instagram post URLs were supplied, but their contents have not been independently verified.
- No existing application code, project assets, domain ownership, or provider configuration were present in the workspace.

## Product Principles

1. A real accepted message is the only source of an ornament.
2. Anonymity is accurately described and never used to imply that the service cannot process abuse signals.
3. Public decoration and private message content remain separate at every API, cache, analytics, and realtime boundary.
4. The tree creates delight; Mail, keyboard access, reduced motion, and a static fallback preserve utility.
5. Safety and privacy readiness precede public launch; a missed date never justifies removing a hard gate.

## Accessibility & Inclusion

Design mobile-first, preserve keyboard and screen-reader access to every message, provide reduced-motion and no-WebGL fallbacks, and target WCAG 2.2 AA. Do not make color, animation, or the 3D tree the only way to distinguish or open messages.
