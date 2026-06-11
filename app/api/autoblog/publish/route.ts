import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createEngineClient } from '@/lib/supabase/engine';
import { requireContentAccess } from '@/lib/autoblog/auth';
import { resolveContentType } from '@/lib/autoblog/content-type';

function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

export async function POST(request: Request) {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const { runId, markdown } = await request.json();
  if (!runId || !markdown) {
    return NextResponse.json({ error: 'Missing runId or markdown' }, { status: 400 });
  }

  // Two databases: runs live in the engine DB (tendriv-blog-content);
  // blog_posts lives in the marketing DB that tendriv.ca renders from.
  const engine = createEngineClient();
  const marketing = await createServiceRoleClient();

  const { data: run, error: runError } = await engine
    .from('autoblog_runs')
    .select('headline, seo_metadata, completed_at')
    .eq('run_id', runId)
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const seo = run.seo_metadata as {
    primaryKeyword: string;
    secondaryKeywords: string[];
    targetSlug: string;
    schemaType: string;
    metaTitle: string;
    metaDescription: string;
  } | null;

  if (!seo || !run.headline) {
    return NextResponse.json({ error: 'Run missing draft data' }, { status: 400 });
  }

  const plainExcerpt = stripMarkdown(markdown).slice(0, 160);
  const wordCount = markdown.split(/\s+/).length;
  const now = new Date().toISOString();

  let jsonldOverride: Record<string, unknown> = {};
  if (seo.schemaType === 'Article') {
    jsonldOverride = {
      '@type': 'Article',
      headline: run.headline,
      datePublished: now.split('T')[0],
      author: { '@type': 'Organization', name: 'Tendriv' },
      publisher: { '@type': 'Organization', name: 'Tendriv' },
      description: seo.metaDescription,
    };
  } else if (seo.schemaType === 'FAQPage') {
    jsonldOverride = { '@type': 'FAQPage', mainEntity: [] };
  } else {
    jsonldOverride = { '@type': 'HowTo', name: run.headline, step: [] };
  }

  // Same contract as the engine's insertBlogPost: review-state row, suffixed
  // slug (never collides with a published slug), no published_at — promotion
  // to 'published' is the approval surface's job.
  const slug = `${seo.targetSlug}-${Date.now()}`;
  const { error: insertError } = await marketing.from('blog_posts').insert({
    title: run.headline,
    slug,
    content: markdown,
    excerpt: plainExcerpt,
    meta_description: seo.metaDescription,
    target_keyword: seo.primaryKeyword,
    secondary_keywords: seo.secondaryKeywords,
    content_type: resolveContentType('rfp', seo.schemaType),
    status: 'review',
    generated_by: 'ai-assisted',
    word_count: wordCount,
    reading_time_minutes: Math.ceil(wordCount / 200),
    jsonld_override: jsonldOverride,
    generated_at: run.completed_at,
    author_id: (auth as { userId: string }).userId,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await engine
    .from('autoblog_runs')
    .update({ status: 'review', published_slug: slug })
    .eq('run_id', runId);

  return NextResponse.json({ ok: true, slug, status: 'review' });
}
