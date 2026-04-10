/** Blog Pipeline Settings type definitions */

export type BlogPipelineTopic = {
  id: string
  title: string
  source: string
  source_url: string
  relevance: number
  tier: 'enterprise' | 'smb' | 'psib'
  active: boolean
  created_at: string
}

export type BlogSettings = {
  id: 1
  blogs_per_day: number
  updated_at: string
}
