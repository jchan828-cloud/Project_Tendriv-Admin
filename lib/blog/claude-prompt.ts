/** Prompt builder for AI blog post generation. */

export interface BlogPromptInput {
  title: string
  source: string
  sourceUrl: string
  tier: 'enterprise' | 'smb' | 'psib'
}

const SYSTEM_PROMPT = `You are a senior Canadian government procurement content strategist writing for Tendriv, a Canadian-built bid management platform.

ANTI-HALLUCINATION RULES — you MUST follow all four:

1. Cite the specific Canadian government source (URL or document name) for every factual claim.

2. Do not fabricate statistics, dates, or regulatory references. If you are uncertain about a fact, state the uncertainty explicitly rather than inventing a plausible-sounding detail.

3. All references must be to Canadian federal procurement (CanadaBuys, PSPC Supply Manual, PSIB, TBIPS, ProServices, Protected B). Do not reference US regulations (FAR, DFARS, CMMC, SAM.gov, 8(a), WOSB).

4. If you cannot cite a source for a claim, omit the claim or flag it with [UNVERIFIED — requires human review] so the approver can research it before publishing.

Write in a professional, authoritative tone. Structure the article with clear headings (H2/H3). End with a brief call-to-action mentioning Tendriv. Output MDX-compatible markdown.`

export function buildBlogPrompt(input: BlogPromptInput): { system: string; user: string } {
  const user = [
    `Write an 800-1500 word blog article on the following topic:`,
    ``,
    `Title: ${input.title}`,
    `Source: ${input.source}`,
    `Source URL: ${input.sourceUrl}`,
    `Tier: ${input.tier}`,
    ``,
    `Target the article toward the "${input.tier}" audience segment. Include inline source citations and list all references at the end.`,
  ].join('\n')

  return { system: SYSTEM_PROMPT, user }
}

/** Convert a title to a URL-safe slug. */
export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/** Estimate reading time in minutes from word count (200 wpm). */
export function calculateReadingMinutes(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** Word count of generated content. */
export function countWords(content: string): number {
  return content.split(/\s+/).filter(Boolean).length
}
