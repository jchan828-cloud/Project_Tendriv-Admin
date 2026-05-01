import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
import { STATUS_LABEL, STATUS_BADGE, SOURCE_LABEL, deriveCaslState } from '@/lib/crm/labels'
import { ContactEditButton } from '@/components/crm/contact-edit-button'

const SCORE_BAR_COLOR = (v: number) =>
  v >= 70 ? 'var(--status-success)' : v >= 40 ? 'var(--status-warning)' : 'var(--status-danger)'

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ width: 110, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: 'var(--progress-track)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${value}%`, height: '100%', borderRadius: 3,
            background: SCORE_BAR_COLOR(value),
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
      <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)', width: 48, textAlign: 'right', flexShrink: 0 }}>
        {value}/100
      </span>
    </div>
  )
}

function KvRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
      <span style={{ width: 100, fontSize: 11, color: 'var(--text-label)', fontFamily: 'var(--mono-font)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-body)' }}>{value}</span>
    </div>
  )
}

function CaslIcon({ state }: { state: string }) {
  if (state === 'granted') return <CheckCircle2 size={14} style={{ color: 'var(--status-success)' }} />
  if (state === 'withdrawn') return <XCircle size={14} style={{ color: 'var(--status-danger)' }} />
  if (state === 'pending') return <Clock size={14} style={{ color: 'var(--status-warning)' }} />
  return <AlertCircle size={14} style={{ color: 'var(--text-muted)' }} />
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toISOString().slice(0, 10)
}

const EVENT_LABEL: Record<string, string> = {
  sent: 'Email sent',
  opened: 'Email opened',
  clicked: 'Link clicked',
  replied: 'Reply received',
  bounced: 'Bounced',
  unsubscribed: 'Unsubscribed',
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default async function ProspectDetailPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const supabase = await createServiceRoleClient()

  const [
    { data: contact },
    { data: scoreRow },
    { data: activities },
    { data: attributions },
  ] = await Promise.all([
    supabase
      .from('outreach_contacts')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('lead_scores')
      .select('score, score_breakdown')
      .eq('contact_id', id)
      .single(),
    supabase
      .from('outreach_activity_log')
      .select('id, event_type, occurred_at, event_metadata')
      .eq('contact_id', id)
      .order('occurred_at', { ascending: false })
      .limit(50),
    supabase
      .from('content_attribution')
      .select('touch_type, touched_at, post_id, blog_posts(title)')
      .eq('contact_id', id)
      .order('touched_at', { ascending: false }),
  ])

  if (!contact) notFound()

  const caslState = deriveCaslState(
    contact.status as string,
    (contact.casl_consent_date ?? null) as string | null
  )

  type ScoreBreakdown = {
    content_engagement?: number
    email_engagement?: number
    firmographic?: number
    recency?: number
  }

  const breakdown = scoreRow?.score_breakdown as ScoreBreakdown | null

  const caslBlocked = caslState === 'withdrawn'

  type AttrRow = {
    touch_type: string
    touched_at: string
    post_id: string
    blog_posts: { title: string } | null
  }

  const firstTouch = (attributions as AttrRow[] | null)?.find((a) => a.touch_type === 'first') ?? null
  const lastTouch = (attributions as AttrRow[] | null)?.find((a) => a.touch_type === 'last') ?? null
  const assistTouches = (attributions as AttrRow[] | null)?.filter((a) => a.touch_type === 'assist') ?? []

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Back link */}
      <Link
        href="/crm"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 20 }}
      >
        <ChevronLeft size={14} />
        Back to prospects
      </Link>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono-font)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Unaffiliated
          </p>
          <h1 className="text-heading-xl">{contact.business_name as string}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span className={STATUS_BADGE[contact.status as string] ?? 'badge-neutral'}>
              {STATUS_LABEL[contact.status as string] ?? contact.status as string}
            </span>
            <span className="badge-neutral">
              {SOURCE_LABEL[contact.pipeline as string] ?? contact.pipeline as string}
            </span>
            {scoreRow && (
              <span className="badge-neutral" style={{ fontFamily: 'var(--mono-font)', fontSize: 11 }}>
                Score {scoreRow.score}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            className="btn-primary"
            disabled={caslBlocked}
            title={caslBlocked ? `CASL consent withdrawn. Outreach blocked.` : undefined}
            style={caslBlocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            Send outreach
          </button>
          <ContactEditButton contact={{
            id: contact.id as string,
            business_name: contact.business_name as string,
            contact_email: (contact.contact_email ?? null) as string | null,
            status: contact.status as string,
            pipeline: (contact.pipeline ?? 'manual') as string,
            province: (contact.province ?? null) as string | null,
            contact_website: (contact.contact_website ?? null) as string | null,
            notes: (contact.notes ?? null) as string | null,
            casl_consent_date: (contact.casl_consent_date ?? null) as string | null,
            casl_consent_method: (contact.casl_consent_method ?? null) as string | null,
            casl_consent_source: (contact.casl_consent_source ?? null) as string | null,
          }} />
          <button className="btn-ghost" style={{ color: 'var(--status-danger)' }}>Mark unsubscribed…</button>
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Score breakdown */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Score breakdown</div>
            {!scoreRow ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Score will compute after the first outreach event.
              </p>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono-font)', color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                    Engine-weighted score
                  </div>
                  <div style={{ fontFamily: 'var(--mono-font)', fontSize: 36, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1 }}>
                    {scoreRow.score}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    0–100 per dimension. Engine combines them with proprietary weights.
                  </p>
                </div>
                {breakdown && (
                  <>
                    <ScoreBar label="Content" value={breakdown.content_engagement ?? 0} />
                    <ScoreBar label="Email" value={breakdown.email_engagement ?? 0} />
                    <ScoreBar label="Firmographic" value={breakdown.firmographic ?? 0} />
                    <ScoreBar label="Recency" value={breakdown.recency ?? 0} />
                  </>
                )}
              </>
            )}
          </div>

          {/* Touch attribution */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Touch attribution</div>
            {!firstTouch && !lastTouch && assistTouches.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                This contact hasn&apos;t engaged with any published content.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {firstTouch && (
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono-font)', color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                      First touch
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={firstTouch.blog_posts?.title}>
                      {firstTouch.blog_posts?.title ?? firstTouch.post_id}
                    </div>
                    <div style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatDate(firstTouch.touched_at)}
                    </div>
                  </div>
                )}
                {lastTouch && lastTouch.post_id !== firstTouch?.post_id && (
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono-font)', color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                      Last touch
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-body)' }}>
                      {lastTouch.blog_posts?.title ?? lastTouch.post_id}
                    </div>
                    <div style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatDate(lastTouch.touched_at)}
                    </div>
                  </div>
                )}
                {assistTouches.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono-font)', color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                      Assist touches ({assistTouches.length})
                    </div>
                    {assistTouches.slice(0, 5).map((a, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={a.blog_posts?.title}>
                        {a.blog_posts?.title ?? a.post_id}
                      </div>
                    ))}
                    {assistTouches.length > 5 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono-font)' }}>
                        +{assistTouches.length - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity timeline */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Activity timeline</div>
            {!activities || activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 13 }}>No activity yet. This contact hasn&apos;t been reached out to.</p>
              </div>
            ) : (
              <div>
                {activities.map((a) => (
                  <div
                    key={a.id as string}
                    style={{
                      display: 'flex', gap: 12, paddingBottom: 12, marginBottom: 12,
                      borderBottom: '0.5px solid var(--border)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, minWidth: 54 }}>
                      {formatRelativeTime(a.occurred_at as string)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-body)' }}>
                      {EVENT_LABEL[a.event_type as string] ?? a.event_type as string}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Contact card */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="section-label" style={{ marginBottom: 14 }}>Contact</div>
            {contact.contact_email && (
              <KvRow label="Email" value={
                <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12 }}>
                  {contact.contact_email as string}
                </span>
              } />
            )}
            {contact.province && (
              <KvRow label="Province" value={
                <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12 }}>
                  {contact.province as string}
                </span>
              } />
            )}
            {(contact.contact_website as string | null) && (
              <KvRow label="Website" value={
                <a href={contact.contact_website as string} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--jade-dim)', fontFamily: 'var(--mono-font)' }}>
                  {contact.contact_website as string}
                </a>
              } />
            )}
            {contact.notes && (
              <KvRow label="Notes" value={
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {contact.notes as string}
                </span>
              } />
            )}
          </div>

          {/* CASL consent card */}
          <div
            className="card"
            style={{
              padding: '16px 20px',
              borderColor: caslBlocked ? 'var(--status-danger)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div className="section-label">CASL consent</div>
              <CaslIcon state={caslState} />
            </div>
            <KvRow label="State" value={
              <span style={{ textTransform: 'capitalize', fontSize: 13 }}>{caslState}</span>
            } />
            <KvRow label="Granted at" value={
              <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                {formatDate(contact.casl_consent_date as string | null)}
              </span>
            } />
            <KvRow label="Method" value={
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {(contact.casl_consent_method as string | null) ?? '—'}
              </span>
            } />
            <KvRow label="Source" value={
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {(contact.casl_consent_source as string | null) ?? '—'}
              </span>
            } />
          </div>
        </div>
      </div>
    </div>
  )
}
