/** RBAC role helpers — reads user_roles table, falls back to full access */

import { SupabaseClient } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'editor' | 'analyst' | 'crm-manager'
export type ModuleKey = 'content' | 'analytics' | 'crm' | 'sales' | 'finance' | 'feedback' | 'system'

export interface UserRoleRecord {
  role: UserRole
  modules: ModuleKey[]
}

/** Default: full access for users without an explicit role row */
const DEFAULT_ROLE: UserRoleRecord = {
  role: 'admin',
  modules: ['content', 'analytics', 'crm', 'sales', 'finance', 'feedback', 'system'],
}

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRoleRecord> {
  const { data } = await supabase
    .from('user_roles')
    .select('role, modules')
    .eq('user_id', userId)
    .single()

  if (!data) return DEFAULT_ROLE

  return {
    role: data.role,
    modules: data.modules,
  }
}

export function canAccessModule(userModules: ModuleKey[], module: ModuleKey): boolean {
  return userModules.includes(module)
}
