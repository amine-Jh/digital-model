import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env'

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowser() {
  if (_client) return _client
  _client = createBrowserClient<Database>(getSupabaseUrl(), getSupabasePublishableKey())
  return _client
}
