import type { Tables } from './database.types'

type AutoblogRunRow = Tables<'autoblog_runs'>
type AutoblogSettingsRow = Tables<'autoblog_settings'>

export type AutoblogRunStatus = 'running' | 'completed' | 'published' | 'failed' | 'rejected' | 'timeout'

export type AutoblogRun = Omit<AutoblogRunRow, 'status' | 'seo_metadata'> & {
  status: AutoblogRunStatus
  seo_metadata: SeoMetadata | null
}

export interface SeoMetadata {
  primaryKeyword: string
  secondaryKeywords: string[]
  targetSlug: string
  schemaType: string
  contentSilo: string
  metaTitle: string
  metaDescription: string
}

export type AutoblogFrequency = 'daily' | 'every_2_days' | 'weekly'

export type AutoblogSettings = Omit<AutoblogSettingsRow, 'frequency'> & {
  frequency: AutoblogFrequency
}

export interface AutoblogEvent {
  type: string
  [key: string]: unknown
}
