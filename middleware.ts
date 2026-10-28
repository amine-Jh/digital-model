import { type NextRequest } from 'next/server'
import { updateSupabaseSession } from '@/lib/supabase/middleware'

/**
 * Netlify OpenNext runs this as an Edge Function. Next.js 16 `proxy.ts`
 * defaults to the Node runtime, which Netlify does not support.
 */
export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
