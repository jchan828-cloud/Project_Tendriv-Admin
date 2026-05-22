# Audit log

Append-only compliance trail. Every state-changing action across
the admin should write a row; reads happen only from the
`(dashboard)/audit` page.

## Entry points

- UI: `app/(dashboard)/audit/`
- Writer: `lib/audit/log.ts`
- Schema: `supabase/migrations/20260324000007_audit_log.sql`

## Write path

```mermaid
flowchart LR
    A[Any api/* handler] --> W["lib/audit/log.ts<br/>logAudit(...)"]
    W --> DB[(audit_log)]
    DB -. read-only .-> UI[(dashboard)/audit]
```

## Immutability guard

The migration installs two PostgreSQL rules to make UPDATE and DELETE
no-ops at the database layer:

```sql
CREATE RULE no_update_audit_log AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_log AS ON DELETE TO audit_log DO INSTEAD NOTHING;
```

This means even a misconfigured RLS policy or a hand-written
`UPDATE audit_log` from the Supabase SQL editor will silently
no-op — the table is genuinely append-only.

## Required columns per write

| Column | Source | CHECK |
|---|---|---|
| `event_type` | caller (e.g. `'blog_post.published'`) | free-text |
| `actor_type` | caller | `user`, `cron`, `system`, `api-key` |
| `actor_id` | auth.users.id when user, else NULL | — |
| `resource_type` | caller (e.g. `'blog_posts'`) | free-text |
| `resource_id` | caller (string, even for UUIDs) | — |
| `ip_hash` | sha256 of client IP | — |
| `metadata` | jsonb context | — |

## Tables touched

| Table | Read | Write |
|---|:-:|:-:|
| `audit_log` | ✓ (UI only) | ✓ (`lib/audit/log.ts` from any handler) |
