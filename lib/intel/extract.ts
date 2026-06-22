/**
 * B2B-INTEL-001 · Stage 4 — AI Extraction.
 *
 * Feeds the unstructured Stage-3 snippet text to an LLM under a strict system
 * prompt and a normalized JSON schema. The plan names Vertex AI (Gemini 2.5
 * Flash) as primary; since this repo already ships an ANTHROPIC_API_KEY, we
 * keep Claude as a zero-extra-cost fallback. Either way the model output is
 * validated against ExtractionResultSchema before it can reach the warehouse.
 */

import {
  GEMINI_BASE_URL,
  GEMINI_MODEL,
  type GoogleIntelEnv,
} from './config'
import {
  ExtractionResultSchema,
  type ExtractionResult,
} from '@/lib/types/intel'
import type { Fetcher } from './places'

const SYSTEM_PROMPT = `You are a B2B data extraction engine. From the provided search-result snippets about a single company, extract two entity lists and return STRICT JSON ONLY (no prose, no markdown fences).

Rules:
- "contacts": real people. full_name is required; title and linkedin_url when present; confidence 0-1.
- "technographics": concrete software/tools/languages/cloud/frameworks mentioned in job posts. tool_name required; category and evidence_url when inferable.
- Do not invent data. If a field is unknown use null. If nothing is found return empty arrays.
- Output shape: {"contacts":[{"full_name","title","linkedin_url","confidence"}],"technographics":[{"tool_name","category","evidence_url"}]}`

/** A provider-agnostic extraction function (also the test seam). */
export type Extractor = (companyName: string, text: string) => Promise<ExtractionResult>

/** Safely pull the first JSON object out of a model response. */
function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in model output')
  return JSON.parse(trimmed.slice(start, end + 1))
}

/* ───────────────────────── Gemini (primary) ───────────────────── */

async function extractWithGemini(
  companyName: string,
  text: string,
  apiKey: string,
  fetcher: Fetcher,
): Promise<ExtractionResult> {
  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const res = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        { role: 'user', parts: [{ text: `Company: ${companyName}\n\nSnippets:\n${text}` }] },
      ],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini extract ${res.status}: ${body}`)
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const out = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return ExtractionResultSchema.parse(parseModelJson(out))
}

/* ──────────────────────── Anthropic (fallback) ─────────────────── */

async function extractWithAnthropic(
  companyName: string,
  text: string,
  apiKey: string,
  fetcher: Fetcher,
): Promise<ExtractionResult> {
  const res = await fetcher('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': process.env.ANTHROPIC_API_VERSION ?? '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Company: ${companyName}\n\nSnippets:\n${text}` },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Anthropic extract ${res.status}: ${body}`)
  }

  const json = (await res.json()) as { content?: { text?: string }[] }
  const out = json.content?.[0]?.text ?? ''
  return ExtractionResultSchema.parse(parseModelJson(out))
}

/**
 * Build the configured extractor. Gemini if a key is present (the planned
 * Vertex/Gemini path), otherwise Anthropic. assertIntelEnv guarantees at least
 * one is set before we reach here.
 */
export function makeExtractor(
  env: GoogleIntelEnv,
  opts: { fetcher?: Fetcher } = {},
): Extractor {
  const fetcher = opts.fetcher ?? fetch
  if (env.geminiApiKey) {
    const key = env.geminiApiKey
    return (name, text) => extractWithGemini(name, text, key, fetcher)
  }
  if (env.anthropicApiKey) {
    const key = env.anthropicApiKey
    return (name, text) => extractWithAnthropic(name, text, key, fetcher)
  }
  throw new Error('No AI extraction provider configured')
}
