/** MK8-CMS-006: Gate submission Zod schema */

import { z } from 'zod'

export const GateSubmitSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  organisation: z.string().min(1).max(200),
  source_post_id: z.string().uuid(),
})
export type GateSubmit = z.infer<typeof GateSubmitSchema>
