'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DraftActions({ id, status }: { id: string; status: string }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAction(newStatus: 'approved' | 'rejected') {
    setLoading(true);
    await fetch(`/api/admin/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, reviewer_notes: notes }),
    });
    router.refresh();
    setLoading(false);
  }

  if (status === 'approved' || status === 'rejected') {
    return <p className="text-sm text-gray-500">Status: {status}</p>;
  }

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Reviewer notes (optional)"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        rows={3}
      />
      <div className="flex gap-2">
        <button onClick={() => handleAction('approved')} disabled={loading}
          className="rounded bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50">Approve</button>
        <button onClick={() => handleAction('rejected')} disabled={loading}
          className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">Reject</button>
      </div>
    </div>
  );
}
