# Project Vault

Lightweight memory for Health Vault. Tracks how we think, what we've done, and where we're going — so context survives across sessions.

## Structure

| Path | Purpose |
|---|---|
| `actions-log.md` | Append-only log of key past actions & decisions (newest at top). |
| `brainstorms/` | Dated brainstorming notes — open questions, options, conclusions. |
| `plans/` | Roadmaps and feature plans. The living `roadmap.md` is the source of truth for "what's next". |

Formal, reviewed specs produced via the brainstorming workflow live under
`docs/superpowers/specs/` and are linked from the relevant brainstorm/plan here.

## Conventions
- Files are dated `YYYY-MM-DD-<topic>.md`.
- `actions-log.md` is appended to, never rewritten — it's the audit trail.
- Keep entries short. Link out to specs/PRs rather than duplicating detail.
