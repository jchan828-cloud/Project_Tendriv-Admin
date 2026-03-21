'use client';

import { useState } from 'react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  published: 'bg-teal-100 text-teal-800',
};

const TIERS = ['All', 'Enterprise', 'SMB', 'PSIB', 'Public'] as const;

type Draft = {
  id: string;
  title: string;
  slug: string;
  tier: string;
  type: string;
  status: string;
  created_at: string;
  generated_by: string;
};

export function DraftTable({ drafts }: { drafts: Draft[] }) {
  const [tier, setTier] = useState('All');
  const filtered = tier === 'All' ? drafts : drafts.filter((d) => d.tier === tier.toLowerCase());

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {TIERS.map((t) => (
          <button key={t} onClick={() => setTier(t)}
            className={`rounded px-3 py-1 text-xs ${tier === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b text-xs text-gray-500">
          <th className="pb-2">Title</th><th className="pb-2">Tier</th><th className="pb-2">Type</th>
          <th className="pb-2">Status</th><th className="pb-2">Created</th><th className="pb-2" />
        </tr></thead>
        <tbody>
          {filtered.map((d) => (
            <tr key={d.id} className="border-b">
              <td className="py-2 font-medium">{d.title}</td>
              <td className="py-2 capitalize">{d.tier}</td>
              <td className="py-2">{d.type}</td>
              <td className="py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {d.status}
                </span>
              </td>
              <td className="py-2 text-gray-500">{new Date(d.created_at).toLocaleDateString()}</td>
              <td className="py-2"><Link href={`/drafts/${d.id}`} className="text-blue-600 hover:underline">Review</Link></td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No drafts found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
