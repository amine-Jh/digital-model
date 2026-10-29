import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'
<<<<<<< Updated upstream
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'
=======
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env'
>>>>>>> Stashed changes

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowser() {
  if (_client) return _client
<<<<<<< Updated upstream
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Set them in the host env (Netlify/Vercel) and redeploy.',
    )
  }
  _client = createBrowserClient<Database>(url, key)
=======
  _client = createBrowserClient<Database>(getSupabaseUrl(), getSupabasePublishableKey())
>>>>>>> Stashed changes
  return _client
}
