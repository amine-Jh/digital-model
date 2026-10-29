import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'
import {
  SUPABASE_ENV_MISSING_MESSAGE,
  getSupabasePublishableKey,
  getSupabaseUrl,
} from '@/lib/supabase/env'

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowser() {
  if (_client) return _client
  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()
  if (!url || !key) {
    throw new Error(SUPABASE_ENV_MISSING_MESSAGE)
  }
  _client = createBrowserClient<Database>(url, key)
  return _client
}
