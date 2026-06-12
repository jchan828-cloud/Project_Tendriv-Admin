/** MK8-CMS-007: Publish channel Zod schema */

import { z } from 'zod'

// W1: 'blog' removed — going live on blog_posts is a status transition owned by
// promote/reject/Submit-for-Review, not a publish-router channel.
export const PublishChannelValues = ['cyberimpact', 'linkedin-draft'] as const
export const PublishRequestSchema = z.object({
  channels: z.array(z.enum(PublishChannelValues)).min(1),
})
