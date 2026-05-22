# Finance & billing

Internal finance dashboard: vendor spend (Supabase, Vercel,
Anthropic…), customer revenue, tiers, top users, and
income/expense ledger.

## Entry points

- UI: `app/(dashboard)/finance/` (overview), `finance/analytics`,
  `finance/billing`, `finance/customers`, `finance/top-users`
- API: `app/api/finance/{summary,analytics,billing,customers,tiers,transactions,top-users}/*/route.ts`

## Data flow

```mermaid
flowchart TB
    subgraph Sources["Inputs (manual entry)"]
        T[finance_transactions<br/>income/expense ledger]
        B[billing_accounts<br/>vendor subscriptions]
        C[customers<br/>MRR, tier, status]
        R[customer_revenue<br/>monthly per-customer]
        U[service_usage<br/>per-customer per-service]
        M[expense_service_mapping<br/>vendor → service COGS]
    end

    subgraph Views
        OV[Overview / summary]
        AN[Analytics<br/>MRR, churn, COGS]
        BL[Billing list]
        CU[Customers list]
        TU[Top users<br/>by service_usage]
    end

    T --> OV
    T --> AN
    B --> BL
    B --> OV
    C --> CU
    C --> AN
    R --> AN
    U --> TU
    U --> AN
    M --> AN
```

## Tables touched

| Table | Read | Write |
|---|:-:|:-:|
| `finance_transactions` | ✓ | ✓ |
| `billing_accounts` | ✓ | ✓ |
| `customers` | ✓ | ✓ |
| `customer_tiers` | ✓ | ✓ |
| `customer_revenue` | ✓ | ✓ |
| `service_usage` | ✓ | ✓ |
| `expense_service_mapping` | ✓ | ✓ |

## See also

- [`state-machines/billing-accounts.md`](../state-machines/billing-accounts.md)
- [`state-machines/customers.md`](../state-machines/customers.md)
