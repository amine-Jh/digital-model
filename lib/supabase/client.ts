import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowser() {
  if (_client) return _client
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Set them in the host env (Netlify/Vercel) and redeploy.',
    )
  }
  _client = createBrowserClient<Database>(url, key)
  return _client
}
