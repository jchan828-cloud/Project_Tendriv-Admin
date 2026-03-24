/** MK8-ANL-001: UTM builder page */

import { createServiceRoleClient } from '@/lib/supabase/server'

export default async function UtmsPage() {
  const supabase = await createServiceRoleClient()

  const { data: campaigns } = await supabase
    .from('utm_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-heading-lg">UTM Builder</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="section-label py-2">Name</th>
              <th className="section-label py-2">Source</th>
              <th className="section-label py-2">Medium</th>
              <th className="section-label py-2">Campaign</th>
              <th className="section-label py-2">Short Code</th>
              <th className="section-label py-2 text-right">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {(campaigns ?? []).map((c) => (
              <tr key={c.id} className="border-b border-[var(--border)]">
                <td className="py-2 font-medium">{c.name}</td>
                <td className="py-2 text-mono-xs">{c.utm_source}</td>
                <td className="py-2 text-mono-xs">{c.utm_medium}</td>
                <td className="py-2 text-mono-xs">{c.utm_campaign}</td>
                <td className="py-2">
                  <span className="badge badge-jade">{c.short_code}</span>
                </td>
                <td className="py-2 text-right text-data-sm">{c.click_count}</td>
              </tr>
            ))}
            {(campaigns ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                  No UTM campaigns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
