'use client';

import type { OutreachActivityLog } from '@/lib/types/crm';

const EVENT_COLORS: Record<string, string> = {
  sent: 'bg-blue-100 text-blue-800',
  opened: 'bg-green-100 text-green-800',
  clicked: 'bg-teal-100 text-teal-800',
  replied: 'bg-emerald-100 text-emerald-800',
  bounced: 'bg-red-100 text-red-800',
  unsubscribed: 'bg-gray-100 text-gray-500',
};

export function ActivityTimeline({ activities }: { activities: OutreachActivityLog[] }) {
  if (activities.length === 0) {
    return <p className="py-4 text-sm text-gray-400">No activity recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {activities.map((a) => (
        <div key={a.id} className="flex items-center gap-3 border-l-2 border-gray-200 pl-4">
          <span className="text-xs text-gray-500">
            {new Date(a.occurred_at).toLocaleDateString()}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${EVENT_COLORS[a.event_type] ?? 'bg-gray-100 text-gray-700'}`}>
            {a.event_type}
          </span>
        </div>
      ))}
    </div>
  );
}
