/** MK7-CRM-001: Sovereign CRM type definitions */

export type ContactPipeline = 'psib' | 'geo' | 'manual'

export type ContactStatus =
  | 'prospect'
  | 'contacted'
  | 'replied'
  | 'demo'
  | 'converted'
  | 'unsubscribed'

export type OutreachContact = {
  id: string
  pipeline: ContactPipeline
  business_name: string
  contact_email: string | null
  contact_website: string | null
  province: string | null
  unspsc_categories: string[]
  ibd_registered: boolean
  source_url: string | null
  status: ContactStatus
  cyberimpact_member_id: string | null
  notes: string | null
  created_at: string
  last_activity_at: string | null
  casl_consent_method: string | null
  casl_consent_date: string | null
  casl_consent_source: string | null
}

export type OutreachSequence = {
  id: string
  pipeline: 'psib' | 'geo'
  step: number
  delay_days: number
  subject_template: string
  body_template: string
  is_active: boolean
  created_at: string
}

export type ActivityEventType =
  | 'sent'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'bounced'
  | 'unsubscribed'

export type OutreachActivityLog = {
  id: string
  contact_id: string
  sequence_id: string | null
  event_type: ActivityEventType
  event_metadata: Record<string, unknown>
  occurred_at: string
}

export type OutreachMatch = {
  id: string
  contact_id: string
  notice_id: string
  match_score: number
  matched_unspsc: string | null
  notified: boolean
  created_at: string
}
