/** MK8-CMS-008: Post versions page */

import Link from 'next/link'
import { VersionTimeline } from '@/components/cms/version-timeline'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VersionsPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-heading-lg">Version History</h1>
        <Link href={`/posts/${id}`} className="btn-secondary btn-sm">
          Back to Editor
        </Link>
      </div>
      <VersionTimeline postId={id} />
    </div>
  )
}
