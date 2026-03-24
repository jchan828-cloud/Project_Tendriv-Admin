/** MK8-CMS-007: Publish channel Zod schema */

import { z } from 'zod'

export const PublishChannelValues = ['blog', 'cyberimpact', 'linkedin-draft'] as const
export const PublishRequestSchema = z.object({
  channels: z.array(z.enum(PublishChannelValues)).min(1),
})
