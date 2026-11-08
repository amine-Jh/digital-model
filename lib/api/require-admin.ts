import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getSupabaseServer } from '@/lib/supabase/server'

export type AdminGate =
  | { user: User; role: 'admin' | 'super_admin'; sb: Awaited<ReturnType<typeof getSupabaseServer>> }
  | { response: NextResponse }

/** Admin and super admin. Teachers and students are refused. */
export async function requireAdmin(): Promise<AdminGate> {
  const sb = await getSupabaseServer()
  const {
    data: { user },
    error,
  } = await sb.auth.getUser()
  if (error || !user) {
    return { response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }
  const { data: row } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (row?.role !== 'admin' && row?.role !== 'super_admin') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, role: row.role, sb }
}
