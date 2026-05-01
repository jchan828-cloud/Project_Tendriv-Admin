import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'

function formatCAD(amount: number): string {
  return `$${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default async function DashboardHome() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const roleRecord = await getUserRole(authClient, user.id)
  const supabase = await createServiceRoleClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const [
    mrrResult,
    prospectsResult,
    postsResult,
    feedbackResult,
    pipelineResult,
    activityResult,
    accountsResult,
  ] = await Promise.all([
    // MRR: sum of active customer MRR
    supabase
      .from('customers')
      .select('mrr')
      .eq('status', 'active'),

    // Active prospects
    supabase
      .from('outreach_contacts')
      .select('id', { count: 'exact', head: true })
      .in('status', ['contacted', 'replied', 'demo']),

    // Posts published this month
    supabase
      .from('blog_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', monthStart),

    // Open feedback
    supabase
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .in('status', ['new', 'reviewed', 'in-progress']),

    // Pipeline value (active stages)
    supabase
      .from('deals')
      .select('value')
      .not('stage', 'in', '(won,lost)'),

    // Recent activity — last 25 audit log events
    supabase
      .from('audit_log')
      .select('id, created_at, actor_email, actor_type, module, action, resource_type, resource_id')
      .order('created_at', { ascending: false })
      .limit(25),

    // Top accounts — fetch with contacts and scores
    supabase
      .from('abm_accounts')
      .select(`
        id, name, organisation_type,
        abm_account_contacts ( contact_id )
      `)
      .limit(50),
  ])

  const mrr = (mrrResult.data ?? []).reduce(
    (sum, c) => sum + ((c as { mrr: number }).mrr ?? 0),
    0
  )
  const activeProspects = prospectsResult.count ?? 0
  const postsPublished = postsResult.count ?? 0
  const openFeedback = feedbackResult.count ?? 0
  const pipelineValue = (pipelineResult.data ?? []).reduce(
    (sum, d) => sum + ((d as { value: number }).value ?? 0),
    0
  )

  type AuditRow = {
    id: string
    created_at: string
    actor_email: string | null
    actor_type: string
    module: string
    action: string
    resource_type: string
    resource_id: string | null
  }
  const activity = (activityResult.data ?? []) as AuditRow[]

  type AccountRow = {
    id: string
    name: string
    organisation_type: string
    abm_account_contacts: { contact_id: string }[]
  }
  const accounts = ((accountsResult.data ?? []) as AccountRow[])
    .map((a) => ({
      id: a.id,
      name: a.name,
      org_type: a.organisation_type,
      contact_count: a.abm_account_contacts.length,
    }))
    .sort((a, b) => b.contact_count - a.contact_count || a.name.localeCompare(b.name))
    .slice(0, 5)

  const isEmpty =
    mrr === 0 &&
    activeProspects === 0 &&
    postsPublished === 0 &&
    openFeedback === 0 &&
    pipelineValue === 0 &&
    activity.length === 0

  const getStartedHref = roleRecord.modules.includes('content')
    ? '/posts/new'
    : roleRecord.modules.includes('crm')
      ? '/crm'
      : '/settings/profile'

  const ACTOR_TYPE_LABEL: Record<string, string> = {
    user: 'USER',
    cron: 'CRON',
    system: 'SYSTEM',
    'api-key': 'API-KEY',
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Sovereign infrastructure, ca-central-1.
        </p>
      </div>

      {isEmpty ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8 }}>
            Welcome to Tendriv.
          </h2>
          <p style={{ fontSize: 13, maxWidth: 400, margin: '0 auto 24px' }}>
            Once you start tracking prospects, publishing content, or recording revenue,
            this dashboard will populate automatically.
          </p>
          <a href={getStartedHref} className="btn-primary">Get started</a>
        </div>
      ) : (
        <>
          {/* KV strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div className="text-eyebrow">MRR</div>
              <div className="text-data-md" style={{ fontFamily: 'var(--mono-font)', fontVariantNumeric: 'tabular-nums' }}>
                {formatCAD(mrr)}
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div className="text-eyebrow">Active prospects</div>
              <div className="text-data-md">{activeProspects}</div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div className="text-eyebrow">Posts published</div>
              <div className="text-data-md">{postsPublished} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>/ month</span></div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div className="text-eyebrow">Open feedback</div>
              <div className="text-data-md">{openFeedback}</div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div className="text-eyebrow">Pipeline value</div>
              <div className="text-data-md" style={{ fontFamily: 'var(--mono-font)', fontVariantNumeric: 'tabular-nums' }}>
                {formatCAD(pipelineValue)}
              </div>
            </div>
          </div>

          {/* Two-column body */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Left: activity feed */}
            <div>
              <div className="section-label" style={{ marginBottom: 12 }}>Recent activity</div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {activity.length === 0 ? (
                  <p style={{ padding: '24px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                    No activity recorded yet.
                  </p>
                ) : (
                  activity.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '10px 20px',
                        borderBottom: '0.5px solid var(--border)',
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontFamily: 'var(--mono-font)', color: 'var(--text-muted)', flexShrink: 0, minWidth: 60 }}>
                        {formatRelativeTime(event.created_at)}
                      </span>
                      <span className="badge-neutral" style={{ fontSize: 10, flexShrink: 0 }}>
                        {ACTOR_TYPE_LABEL[event.actor_type] ?? event.actor_type}
                      </span>
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--mono-font)', fontSize: 11 }}>
                        {event.module}
                      </span>
                      <span style={{ color: 'var(--text-body)' }}>
                        <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)' }}>
                          {event.actor_email ?? event.actor_type}
                        </span>
                        {' '}
                        {event.action}
                        {' '}
                        <span style={{ fontFamily: 'var(--mono-font)', color: 'var(--text-muted)' }}>
                          {event.resource_type}
                          {event.resource_id && ` · ${event.resource_id.slice(0, 7)}…`}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: top accounts + sovereignty */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 4 }}>Top accounts</div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'var(--mono-font)' }}>
                  By lead score, all time
                </p>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {accounts.length === 0 ? (
                    <p style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                      No accounts yet.
                    </p>
                  ) : (
                    accounts.map((account, i) => (
                      <div
                        key={account.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 16px',
                          borderBottom: i < accounts.length - 1 ? '0.5px solid var(--border)' : undefined,
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontFamily: 'var(--mono-font)', color: 'var(--text-muted)', width: 16 }}>
                          {i + 1}.
                        </span>
                        <span
                          style={{ color: 'var(--text-body)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={account.name}
                        >
                          {account.name}
                        </span>
                        <span style={{ fontFamily: 'var(--mono-font)', color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>
                          {account.contact_count}c
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sovereignty card */}
              <div className="card" style={{ padding: '16px 20px' }}>
                <div className="section-label" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={12} style={{ color: 'var(--jade)' }} />
                  Sovereignty
                </div>
                <div className="sovereignty-pill" style={{ marginBottom: 10 }}>
                  Data stored in Canada
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  All data stored in ca-central-1. Encrypted at rest, in transit.
                  CASL-compliant consent on every outreach contact.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
