'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  return (
    <button
      type="button"
      className="btn-secondary btn-sm"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
    >
      {isPending ? 'Refreshing…' : 'Refresh'}
    </button>
  )
}
