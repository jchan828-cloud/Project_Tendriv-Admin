# Security — Authorized Supabase Project

| Field | Value |
|-------|-------|
| **Authorized Project** | `epremgahbzjnlpzaqdcj` |
| **Region** | `ca-central-1` |
| **Display Name** | tendriv-marketing |

**NEVER** use the core app project refs in this repository: `vyidgzeqvldoehheenkq`
(tendriv-v5, the canonical core product) or `oryfwhprnfllpeffumyx`
(decommission-track bid-master-v4, being abandoned) (reconciled 2026-06-15 vs
founder direction — the forbidden core app is now tendriv-v5; `oryfwhprnfllpeffumyx`
is the legacy v4 ref).

All Supabase calls in this repo connect to the marketing project only.
The `SUPABASE_SERVICE_ROLE_KEY` env var corresponds to the marketing project.
