import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <nav className="flex items-center gap-4">
          <Link href="/drafts" className="text-sm font-semibold text-gray-900">Drafts</Link>
          <Link href="/crm" className="text-sm font-semibold text-gray-900">CRM</Link>
        </nav>
        <span className="text-xs text-gray-500">{user?.email}</span>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
