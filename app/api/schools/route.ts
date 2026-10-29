/**
 * GET /api/schools — active establishments (no auth).
 * Used by registration (teacher) and student profile setup.
 *
 * `supabase/setup.sql` gives anonymous users no table access, so the secret
 * key is used when configured; the publishable key is a fallback for
 * databases that still allow public reads of `schools`.
 */
import { NextResponse } from 'next/server'
import { getSupabasePublic, tryGetSupabaseAdmin } from '@/lib/supabase/server'
import type { PublicSchool } from '@/lib/school-directory'

export async function GET() {
  try {
    const sb = tryGetSupabaseAdmin() ?? getSupabasePublic()
    const { data, error } = await sb
      .from('schools')
      .select('id, name, city')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('[schools GET]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const schools: PublicSchool[] = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
    }))

    return NextResponse.json({ schools })
  } catch (e) {
    console.error('[schools GET]', e)
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }
}
