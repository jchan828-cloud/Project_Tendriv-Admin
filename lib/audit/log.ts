/** MK8-INT-003: Immutable audit log — append-only library */

import { SupabaseClient } from '@supabase/supabase-js'

export type AuditEventType =
  | 'post-created'
  | 'post-updated'
  | 'post-status-changed'
  | 'post-published'
  | 'post-version-restored'
  | 'gate-submission'
  | 'utm-created'
  | 'utm-click'
  | 'contact-score-computed'
  | 'score-change-flagged'
  | 'ai-brief-generated'
  | 'publish-channel-routed'
  | 'cron-score-batch'
  | 'tag-created'
  | 'topic-created'
  | 'post-tags-updated'
  | 'post-topics-updated'
  | 'post-version-created'
  | 'post-jsonld-updated'
  | 'deal-created'
  | 'deal-updated'
  | 'deal-deleted'
  | 'media-uploaded'
  | 'finance-transaction-created'
  | 'finance-transaction-updated'
  | 'finance-transaction-deleted'
  | 'billing-account-created'
  | 'billing-account-updated'
  | 'billing-account-deleted'
  | 'customer-created'
  | 'customer-updated'
  | 'customer-deleted'
  | 'feedback-submitted'
  | 'feedback-updated'

export type AuditResourceType =
  | 'post'
  | 'contact'
  | 'utm'
  | 'gate'
  | 'score'
  | 'publish'
  | 'ai-brief'
  | 'version'
  | 'lead-score'
  | 'tag'
  | 'topic'
  | 'deal'
  | 'media'
  | 'finance'
  | 'billing'
  | 'customer'
  | 'feedback'

export interface AuditEntry {
  event_type: AuditEventType
  actor_id: string | null
  actor_type: 'user' | 'cron' | 'system' | 'api-key'
  resource_type: AuditResourceType
  resource_id: string
  metadata?: Record<string, unknown>
  ip_hash?: string
}

export async function appendAuditLog(
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await supabase.from('audit_log').insert(entry)
  } catch (err) {
    console.error('[audit_log] append failed:', err)
    // Never throw — audit failure must not block the originating request
  }
}
