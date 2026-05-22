# Sales pipeline

Kanban-style deal board tracking opportunities from lead through
won/lost.

## Entry points

- UI: `app/(dashboard)/sales/`
- API: `app/api/sales/deals/route.ts`, `app/api/sales/deals/[id]/route.ts`
- Component: `components/sales/pipeline-board.tsx`

## Deal flow

```mermaid
flowchart LR
    L[lead] --> Q[qualified]
    Q --> P[proposal]
    P --> N[negotiation]
    N --> W([won])
    N --> X([lost])
    L -.-> X
    Q -.-> X
    P -.-> X
```

Dotted edges = early disqualification; any stage can move to `lost`.

## Drag-to-update UX

```mermaid
sequenceDiagram
    participant User as Sales rep
    participant Board as pipeline-board.tsx
    participant API as api/sales/deals/[id]
    participant DB as Supabase deals

    User->>Board: drag card from "proposal" to "negotiation"
    Board->>API: PATCH { stage: 'negotiation' }
    API->>DB: UPDATE deals SET stage='negotiation', updated_at=now()
    DB-->>API: row
    API-->>Board: 200
    Board->>Board: optimistic update + reconcile
```

## Tables touched

| Table | Read | Write |
|---|:-:|:-:|
| `deals` | ✓ | ✓ |
| `outreach_contacts` | ✓ | — (join for contact name) |
| `abm_accounts` | ✓ | — |

## See also

- [`state-machines/deals.md`](../state-machines/deals.md)
