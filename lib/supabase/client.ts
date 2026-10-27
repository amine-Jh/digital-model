import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowser() {
  if (_client) return _client
  _client = createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey())
  return _client
}
