export const ORG_TYPE_LABEL: Record<string, string> = {
  ministry: 'Ministry',
  agency: 'Agency',
  'crown-corp': 'Crown corporation',
  enterprise: 'Enterprise',
  'indigenous-org': 'Indigenous organization',
}

export const STATUS_LABEL: Record<string, string> = {
  prospect: 'Prospect',
  contacted: 'Contacted',
  replied: 'Replied',
  demo: 'Demo scheduled',
  converted: 'Converted',
  unsubscribed: 'Unsubscribed',
}

export const STATUS_BADGE: Record<string, string> = {
  prospect: 'badge-neutral',
  contacted: 'badge-info',
  replied: 'badge-jade',
  demo: 'badge-purple',
  converted: 'badge-success',
  unsubscribed: 'badge-neutral',
}

export const SOURCE_LABEL: Record<string, string> = {
  psib: 'PSIB',
  geo: 'Geographic',
  manual: 'Manual',
}

/** Derive a simplified CASL state from the actual schema fields */
export function deriveCaslState(
  status: string,
  caslConsentDate: string | null
): 'granted' | 'pending' | 'withdrawn' {
  if (status === 'unsubscribed') return 'withdrawn'
  if (caslConsentDate) return 'granted'
  return 'pending'
}
