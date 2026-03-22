'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { OutreachContact } from '@/lib/types/crm';

const STATUS_COLORS: Record<string, string> = {
  prospect: 'bg-amber-100 text-amber-800',
  contacted: 'bg-blue-100 text-blue-800',
  replied: 'bg-green-100 text-green-800',
  demo: 'bg-teal-100 text-teal-800',
  converted: 'bg-emerald-100 text-emerald-900',
  unsubscribed: 'bg-gray-100 text-gray-500',
};

const PIPELINES = ['All', 'PSIB', 'Geo', 'Manual'] as const;
const STATUSES = ['All', 'Prospect', 'Contacted', 'Replied', 'Demo', 'Converted', 'Unsubscribed'] as const;

export function ContactTable({ contacts }: { contacts: OutreachContact[] }) {
  const [pipeline, setPipeline] = useState('All');
  const [status, setStatus] = useState('All');

  const filtered = contacts
    .filter((c) => pipeline === 'All' || c.pipeline === pipeline.toLowerCase())
    .filter((c) => status === 'All' || c.status === status.toLowerCase());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          {PIPELINES.map((p) => (
            <button key={p} onClick={() => setPipeline(p)}
              className={`rounded px-3 py-1 text-xs ${pipeline === p ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`rounded px-3 py-1 text-xs ${status === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b text-xs text-gray-500">
          <th className="pb-2">Business Name</th><th className="pb-2">Province</th><th className="pb-2">Pipeline</th>
          <th className="pb-2">Status</th><th className="pb-2">Last Activity</th><th className="pb-2" />
        </tr></thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-2 font-medium">{c.business_name}</td>
              <td className="py-2">{c.province ?? '—'}</td>
              <td className="py-2 capitalize">{c.pipeline}</td>
              <td className="py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {c.status}
                </span>
              </td>
              <td className="py-2 text-gray-500">
                {c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString() : '—'}
              </td>
              <td className="py-2"><Link href={`/crm/${c.id}`} className="text-blue-600 hover:underline">View</Link></td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No contacts found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
