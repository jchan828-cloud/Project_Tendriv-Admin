# Feedback

Customer feedback intake (in-app widget, email, manual), triage,
and response workflow.

## Entry points

- UI: `app/(dashboard)/feedback/`
- API: `app/api/feedback/route.ts` (list/create),
  `app/api/feedback/[id]/route.ts` (read/update),
  `app/api/feedback/[id]/respond/route.ts` (internal reply),
  `app/api/feedback/widget/route.ts` (anonymous public submit)

## Triage flow

```mermaid
flowchart LR
    subgraph Intake
        W[Widget<br/>source=widget] --> N
        E[Email<br/>source=email] --> N
        I[In-app<br/>source=in-app] --> N
        S[Support<br/>source=support] --> N
        SV[Survey<br/>source=survey] --> N
        MN[Manual<br/>source=manual] --> N
    end
    N[status=new] --> R[Reviewer triages]
    R --> CL{Category +<br/>priority +<br/>assignee}
    CL --> RV[status=reviewed]
    RV --> WIP[status=in-progress]
    WIP --> RES[status=resolved<br/>resolved_at=now]
    R --> WF[status=wont-fix]
    R --> DUP[status=duplicate]
    WIP -. internal reply .-> FR[feedback_responses<br/>is_public=false]
    RES -. public reply .-> FR2[feedback_responses<br/>is_public=true]
```

## Tables touched

| Table | Read | Write |
|---|:-:|:-:|
| `feedback` | ✓ | ✓ |
| `feedback_responses` | ✓ | ✓ |
| `customers` | ✓ | — (join for submitter context) |
| `outreach_contacts` | ✓ | — (join for submitter context) |

## See also

- [`state-machines/feedback.md`](../state-machines/feedback.md)
