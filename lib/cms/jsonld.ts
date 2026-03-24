/** MK8-CMS-005: JSON-LD schema markup generator — pure functions, no I/O */

import { BlogPost, Faq, HowToStep } from '@/lib/types/cms'

const PUBLISHER = {
  '@type': 'Organization',
  name: 'Tendriv',
  url: 'https://tendriv.ca',
}

export function inferSchemaType(post: BlogPost): 'Article' | 'FAQPage' | 'HowTo' {
  const keyword = (post.target_keyword ?? '').toLowerCase()
  const title = post.title.toLowerCase()

  if (keyword.includes('faq') || title.includes('faq')) return 'FAQPage'
  if (title.startsWith('how to')) return 'HowTo'
  return 'Article'
}

export function generateArticleSchema(post: BlogPost): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    name: post.title,
    description: post.meta_description ?? post.excerpt ?? '',
    datePublished: post.published_at ?? post.created_at,
    publisher: PUBLISHER,
    author: {
      '@type': 'Person',
      name: post.author_id,
    },
  }
  return JSON.stringify(schema, null, 2)
}

export function generateFaqSchema(post: BlogPost, faqs: Faq[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: post.title,
    description: post.meta_description ?? post.excerpt ?? '',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
  return JSON.stringify(schema, null, 2)
}

export function generateHowToSchema(post: BlogPost, steps: HowToStep[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: post.title,
    description: post.meta_description ?? post.excerpt ?? '',
    step: steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
      ...(step.url ? { url: step.url } : {}),
    })),
  }
  return JSON.stringify(schema, null, 2)
}
