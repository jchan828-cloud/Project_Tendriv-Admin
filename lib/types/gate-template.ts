/** MK8-CMS-007: Template download gate — Zod schema */

import { z } from 'zod'

export const TEMPLATE_IDS = ['tbips-checklist', 'bid-no-bid-framework', 'psib-roadmap'] as const
export type TemplateId = typeof TEMPLATE_IDS[number]

export const GateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  organisation: z.string().min(1).max(200),
  template_id: z.enum(TEMPLATE_IDS),
})
export type GateTemplate = z.infer<typeof GateTemplateSchema>

/** Map template_id → env var name holding the download URL */
export const TEMPLATE_URL_ENV: Record<TemplateId, string> = {
  'tbips-checklist': 'TEMPLATE_URL_TBIPS_CHECKLIST',
  'bid-no-bid-framework': 'TEMPLATE_URL_BID_NO_BID_FRAMEWORK',
  'psib-roadmap': 'TEMPLATE_URL_PSIB_ROADMAP',
}
