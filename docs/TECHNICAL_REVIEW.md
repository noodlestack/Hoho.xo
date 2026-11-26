---
> **Superseded.** The app now has a backend, message storage, and Mail. See README and PRODUCT.md.
---

# Hoho.xo technical review

Reviewed 23 November 2026 against the supplied Master Build Specification v3.1,
the attached idea conversation, the public xmasqr landing page, and the
repository metadata available at that time.

## Product and implementation boundary

The product is an anonymous-to-the-owner message inbox expressed through a
shareable Christmas tree. The QR-to-tree transformation is the memorable entry
point; the private Mail archive is the dependable product. The current
workspace had no application code, credentials, deployment configuration,
or product assets.

The current application is intentionally a private interaction prototype:
QR generation, link validation, the QR/tree animation, QR download, responsive
layout, and a reduced-motion/static fallback. It does not create accounts,
send or store messages, or call a backend. Do not represent it as a live
messaging service.

## Decisions to preserve

- Keep a modular monolith and a single authoritative relational store when
  backend work begins. Do not add a microservice or a second message store.
- Keep message bodies out of the public tree response, QR payload, analytics,
  logs, and realtime events.
- Only an actual accepted message may create an ornament. The tree is a
  recent view, not the archive.
- Keep QR generation standards-compliant and independent of the animation.
  The QR is scannable only in QR view; a downloadable QR must not be a canvas
  screenshot of the morph.
- Keep static, keyboard-accessible, reduced-motion, and no-WebGL paths
  functional before adding a 3D renderer.
- Continue to treat the supplied 13+ age rule as a proposal requiring
  qualified child-safety and privacy/legal review before any public launch.

## Master-spec changes required before backend implementation

1. **Private search:** the Mail API currently puts search text in a GET query
   parameter while another invariant prohibits message text in URLs. Use a
   POST search request with private/no-store caching and URL, proxy, trace, and
   error-log scrubbing.
2. **Retry safety:** add a bounded idempotency key to public message submission.
   Network retries and double taps must not create duplicate messages. Keep the
   accepted and blocked public response shapes identical.
3. **RLS trust boundary:** transaction-local `app.owner_id` is useful defense
   against accidental unscoped queries, but a database role that can execute
   arbitrary SQL can set a custom PostgreSQL setting itself. Describe the
   authenticated application server as part of the trust boundary; do not
   claim this mechanism alone prevents access after runtime-credential
   compromise or SQL injection.
4. **Rate-limit outage:** one section requires fail-closed behavior while
   another suggests a fallback. Choose one explicit policy, test timeouts and
   provider outages, and never silently allow unlimited sends.
5. **Launch sequencing:** Phase 2 must remain private until moderation,
   report/block operations, privacy disclosures, deletion, and the assigned
   review process pass their launch gates. A schedule is not permission to
   bypass those gates.
6. **Retention:** specify what happens to a report case and its minimum
   evidence when an owner deletes a message or account. Align database cascade
   behavior, operational retention, and public privacy wording.
7. **Age/date behavior:** define the jurisdictional date/time rule for
   calculating age and a reviewed rule for leap-day birthdays. Self-entered
   DOB must not be treated as verified identity.

## Repository review

Repository metadata was checked through GitHub on 23 November 2026. No source
was copied, executed, or added to the application.

| Repository | Observed metadata | Assessment |
|---|---|---|
| [basementstudio/shader-lab](https://github.com/basementstudio/shader-lab) | Apache-2.0; 728 stars; updated 23 Nov 2026; not archived | The only clearly licensed repo among the named candidates. Useful as optional future shader research, not needed for this canvas-based prototype. Review dependencies and license notices before adopting code. |
| [hendurhance/whispr](https://github.com/hendurhance/whispr) | 7 stars; updated 2 Nov 2026; not archived; GitHub reports `NOASSERTION` for license | Relevant as a small anonymous-Q&A architecture example only. Do not copy or ship code until a usable license is confirmed and the security model is audited. |
| [Wcoder547/TrueFeedback](https://github.com/Wcoder547/TrueFeedback) | 0 stars; updated 29 May 2026; not archived; no license reported | Not recommended as a base. Its described AI message suggestions conflict with Hoho.xo's real-messages-only rule, and there is no reported license. |
| [leukode-labs/ngl-troll](https://github.com/leukode-labs/ngl-troll) | 0 stars; updated 22 Aug 2026; not archived; no license reported | A roast/novelty page, not a suitable product or safety reference; no reported license. |
| `three-fluid-fx` | The owner/repository URL named in the conversation returned 404 | The reference cannot be verified; do not rely on it. |
| `lol-mini` tutorial | Mentioned without an exact article URL | Not independently verifiable from the supplied information. |

The public [xmasqr page](https://xmasqr.vercel.app/?tree=fairy) currently
describes choosing a tree, entering a link, and growing the QR into a tree.
This confirms its visible product interaction only; its source implementation
was not inspected. The Instagram posts were not independently accessible, so
their contents are unknown. Hoho.xo should not claim to know how either
reference is implemented.

## Agentic-resource discovery

GitHub Agent Finder results relevant to further design or implementation
research:

1. **Mobbin MCP Server** — `application/mcp-server+json`  
   https://api.mcp.github.com/v0.1/servers/com.mobbin%2Fmobbin/versions/1.0.1  
   Relevance score: 76.
2. **ScreensDesign** — `application/mcp-server+json`  
   https://api.mcp.github.com/v0.1/servers/com.screensdesign%2Fscreensdesign/versions/1.0.1  
   Relevance score: 71.
3. **React Three Fiber skill** — `application/agent-skills+md`  
   https://github.com/vercel-labs/json-render/tree/5e99a387536a1528d8113eb929ab4b7e611701ae/skills/react-three-fiber  
   Relevance score: 70.

These scores indicate search relevance only, not trust, security, or quality.
No MCP server, skill, extension, or external repository was installed or
enabled. Review/select any external resource before adding it. The bundled
Impeccable skill already provides design guidance for this prototype.

## Better implementation references

- [OWASP ASVS 5.0](https://asvs.owasp.org/) — turn relevant requirements into
  verifiable application security checks; do not claim ASVS certification.
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
  — define useful security events while excluding private content and secrets.
- [PostgreSQL row security](https://www.postgresql.org/docs/19/ddl-rowsecurity.html)
  — remember table owners, superusers, and `BYPASSRLS` roles can bypass row
  policies; combine grants, server authorization, and tests.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — retain the spec's accessible
  non-canvas paths and verify keyboard, focus, contrast, and motion behavior.

## Provider note

The spec selects Neon PostgreSQL and separate application providers; the
prototype has no provider accounts or credentials. Do not provision services
or choose a paid plan until the owner confirms the account, region, budget, and
operational reviewer. PostgreSQL 19 is available on Neon, but the spec itself
records it became GA only four days before this review; production use should
wait for the complete migration, driver, auth, extension, restore, and test
matrix. Keep PostgreSQL 18 as the conservative fallback if any of those gates
fail.
