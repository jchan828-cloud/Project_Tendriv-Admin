/** Map an engine schema/content format onto the editorial content_type domain
 *  of blog_posts. Keep in sync with rfp-blog workflows/lib/db.ts
 *  resolveContentType — same truth table, two repos.
 *  'howto', 'news', and 'article' require the expanded
 *  blog_posts_content_type_check before they can be written.
 */
export function resolveContentType(workflow: string, schemaFormat: string): string {
  if (schemaFormat === 'HowTo') return 'howto';
  if (schemaFormat === 'NewsArticle') return 'news';
  if (workflow === 'pillar') return 'guide';
  if (workflow === 'rfp') return 'blog';
  return 'article';
}
