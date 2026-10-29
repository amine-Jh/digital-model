/** Email used as the account identifier (Supabase Auth). */
export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidAuthEmail(raw: string): boolean {
  const email = normalizeAuthEmail(raw)
  // Practical check: local@domain.tld — any provider, not Gmail-only.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
