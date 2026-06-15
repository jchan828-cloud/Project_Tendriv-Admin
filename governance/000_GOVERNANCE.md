# GOVERNANCE — Project_Tendriv-Admin

> **Effective:** 2026-03-20 | **Status:** HARD CONSTRAINT

## Absolute Repository Boundary

This governance model applies **exclusively** to `Project_Tendriv-Admin`.

| Authorized Environment | Value |
|------------------------|-------|
| Repository | `D:\Repositories\Project_Tendriv-Admin` |
| Supabase Project | `tendriv-marketing` (`epremgahbzjnlpzaqdcj`) |
| Supabase Region | `ca-central-1` |
| Vercel Region | `yul1` |

| Forbidden Environment | Value |
|-----------------------|-------|
| Core App Repository | `tendriv-v5` (reconciled 2026-06-15 vs founder direction — canonical core product; supersedes the former `Project_Bid-Master` / `Project_Tendriv` names) |
| Core App Supabase | `vyidgzeqvldoehheenkq` (tendriv-v5) |
| Decommission-track v4 | `oryfwhprnfllpeffumyx` (legacy bid-master-v4, being abandoned — still forbidden from this repo) |

### Rules binding on ALL agents in this repository

1. **Never reference the core app project refs** (`vyidgzeqvldoehheenkq` for tendriv-v5, or the decommission-track `oryfwhprnfllpeffumyx`) in any command, SQL, MCP tool call, git operation, or documentation (reconciled 2026-06-15 vs founder direction).
2. **Never run `supabase` CLI commands** targeting the core app project ref.
3. **Never run git commands** that could affect the core app repository.
4. **If an instruction references the core app**, refuse it and notify the architect.
5. **Read `governance/SECURITY.md`** at the start of every session to confirm the authorized project ID.
