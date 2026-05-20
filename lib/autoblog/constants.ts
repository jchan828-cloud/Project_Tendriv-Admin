export const PERSONA_OPTIONS = [
  { value: 'bid-manager', label: 'Bid Manager — experienced procurement professional preparing proposals' },
  { value: 'business-owner', label: 'Business Owner — SMB owner exploring government contracts for the first time' },
  { value: 'procurement-officer', label: 'Procurement Officer — government buyer researching supplier landscape' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_2_days', label: 'Every 2 days' },
  { value: 'weekly', label: 'Weekly' },
] as const;

export const STATUS_CONFIG = {
  running: { label: 'Running', color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
  completed: { label: 'Completed', color: 'var(--status-success)', bg: 'var(--status-success-bg)' },
  published: { label: 'Published', color: 'var(--status-success)', bg: 'var(--status-success-bg)' },
  failed: { label: 'Failed', color: 'var(--sovereign)', bg: 'var(--sovereign-pale)' },
  rejected: { label: 'Rejected', color: 'var(--sovereign)', bg: 'var(--sovereign-pale)' },
  timeout: { label: 'Timed out', color: 'var(--text-muted)', bg: 'var(--surface-badge)' },
} as const;
