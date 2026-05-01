import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { ORG_TYPE_LABEL, STATUS_LABEL, STATUS_BADGE, deriveCaslState } from '@/lib/crm/labels'
import { AccountEditButton } from '@/components/crm/account-edit-button'

function formatCAD(amount: number | null): string {
  if (amount == null) return '—'
  return `$${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toISOString().slice(0, 10)
}

function CaslIcon({ state }: { state: 'granted' | 'pending' | 'withdrawn' }) {
  if (state === 'granted') return <CheckCircle2 size={13} style={{ color: 'var(--status-success)', flexShrink: 0 }} />
  if (state === 'withdrawn') return <XCircle size={13} style={{ color: 'var(--status-danger)', flexShrink: 0 }} />
  return <Clock size={13} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />
}

function KvRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
      <span style={{
        width: 120, fontSize: 11, color: 'var(--text-label)',
        fontFamily: 'var(--mono-font)', textTransform: 'uppercase',
        letterSpacing: '0.06em', flexShrink: 0, paddingTop: 1,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-body)' }}>{value}</span>
    </div>
  )
}

export default async function AccountDetailPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const supabase = await createServiceRoleClient()

  const [{ data: account }, { data: linkRows }] = await Promise.all([
    supabase
      .from('abm_accounts')
      .select('id, name, organisation_type, province, naics_codes, annual_procurement_value_cad, updated_at')
      .eq('id', id)
      .single(),
    supabase
      .from('abm_account_contacts')
      .select('contact_id')
      .eq('account_id', id),
  ])

  if (!account) notFound()

  const contactIds = (linkRows ?? []).map((r) => r.contact_id as string)

  const [{ data: contacts }, { data: scores }, { data: activity }] = await Promise.all([
    contactIds.length > 0
      ? supabase
          .from('outreach_contacts')
          .select('id, business_name, contact_email, status, casl_consent_date, pipeline')
          .in('id', contactIds)
          .order('business_name')
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? supabase
          .from('lead_scores')
          .select('contact_id, score')
          .in('contact_id', contactIds)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? supabase
          .from('outreach_activity_log')
          .select('contact_id, occurred_at')
          .in('contact_id', contactIds)
          .order('occurred_at', { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] }),
  ])

  const scoreMap = new Map((scores ?? []).map((s) => [s.contact_id as string, s.score as number]))

  // Last activity per contact
  const lastActivityMap = new Map<string, string>()
  for (const row of (activity ?? [])) {
    const cid = row.contact_id as string
    if (!lastActivityMap.has(cid)) lastActivityMap.set(cid, row.occurred_at as string)
  }

  const naics = (account.naics_codes ?? []) as string[]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Back link */}
      <Link
        href="/crm/accounts"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 20 }}
      >
        <ChevronLeft size={14} />
        Back to accounts
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono-font)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Account
          </p>
          <h1 className="text-heading-xl">{account.name as string}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span className="badge-neutral">
              {ORG_TYPE_LABEL[account.organisation_type as string] ?? account.organisation_type as string}
            </span>
            {account.province && (
              <span className="badge-neutral" style={{ fontFamily: 'var(--mono-font)', fontSize: 11 }}>
                {account.province as string}
              </span>
            )}
          </div>
        </div>
        <AccountEditButton account={{
          id: account.id as string,
          name: account.name as string,
          organisation_type: account.organisation_type as string,
          province: (account.province ?? null) as string | null,
          naics_codes: (account.naics_codes ?? []) as string[],
          annual_procurement_value_cad: (account.annual_procurement_value_cad ?? null) as number | null,
        }} />
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Left: contacts */}
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>
            Linked contacts ({contacts?.length ?? 0})
          </div>

          {!contacts || contacts.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 13 }}>No contacts linked to this account yet.</p>
            </div>
          ) : (
            <div style={{ border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '0.5px solid var(--border)' }}>
                    {['Name', 'Status', 'Score', 'CASL', 'Last activity'].map((h) => (
                      <th key={h} style={{
                        padding: '8px 14px', textAlign: 'left', fontWeight: 500,
                        color: 'var(--text-label)', whiteSpace: 'nowrap',
                        fontFamily: 'var(--mono-font)', fontSize: 10,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => {
                    const casl = deriveCaslState(c.status as string, (c.casl_consent_date ?? null) as string | null)
                    const lastAt = lastActivityMap.get(c.id as string) ?? null
                    return (
                      <tr
                        key={c.id as string}
                        style={{ borderBottom: '0.5px solid var(--border)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                      >
                        <td style={{ padding: '10px 14px', maxWidth: 240 }}>
                          <Link
                            href={`/crm/${c.id}`}
                            style={{ color: 'var(--text-heading)', fontWeight: 500, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {c.business_name as string}
                          </Link>
                          {c.contact_email && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono-font)' }}>
                              {c.contact_email as string}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className={STATUS_BADGE[c.status as string] ?? 'badge-neutral'} style={{ fontSize: 11 }}>
                            {STATUS_LABEL[c.status as string] ?? c.status as string}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                            {scoreMap.has(c.id as string) ? scoreMap.get(c.id as string) : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <CaslIcon state={casl} />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                            {formatDate(lastAt)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="section-label" style={{ marginBottom: 14 }}>Account details</div>
            <KvRow label="Type" value={ORG_TYPE_LABEL[account.organisation_type as string] ?? account.organisation_type as string} />
            <KvRow label="Province" value={
              <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12 }}>
                {(account.province as string | null) ?? '—'}
              </span>
            } />
            <KvRow label="Annual procurement" value={
              <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                {formatCAD(account.annual_procurement_value_cad as number | null)}
              </span>
            } />
            <KvRow label="Last updated" value={
              <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                {formatDate(account.updated_at as string)}
              </span>
            } />
            {naics.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--text-label)', fontFamily: 'var(--mono-font)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  NAICS codes
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {naics.map((code) => (
                    <span key={code} className="badge-neutral" style={{ fontFamily: 'var(--mono-font)', fontSize: 11 }}>
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity summary */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="section-label" style={{ marginBottom: 14 }}>Activity summary</div>
            <KvRow label="Total events" value={
              <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12 }}>
                {(activity ?? []).length}
              </span>
            } />
            <KvRow label="Last activity" value={
              <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                {activity && activity.length > 0 ? formatDate((activity[0] as { occurred_at: string }).occurred_at) : '—'}
              </span>
            } />
          </div>
        </div>
      </div>
    </div>
  )
}
