/** Claude API call helper for AI blog generation.
 *  Single-purpose: take a system + user prompt, return generated text.
 */

import { z } from 'zod'

const ClaudeResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
})

export interface ClaudeResult {
  text: string | null
  status: number
  errorBody?: string
}

export async function callClaudeMessages(
  system: string,
  user: string,
): Promise<ClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { text: null, status: 0, errorBody: 'ANTHROPIC_API_KEY not configured' }
  }

  const model = process.env.CLAUDE_MODEL_ID ?? 'claude-sonnet-4-6'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    return { text: null, status: res.status, errorBody }
  }

  const json = await res.json().catch(() => null)
  const parsed = ClaudeResponseSchema.safeParse(json)
  if (!parsed.success) {
    return { text: null, status: res.status, errorBody: 'Invalid Claude response shape' }
  }

  const block = parsed.data.content.find((b) => b.type === 'text')
  return { text: block?.text ?? null, status: res.status }
}
