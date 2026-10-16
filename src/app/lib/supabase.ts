import { createClient } from "@supabase/supabase-js"
import { projectId, publicAnonKey } from "../../../utils/supabase/info"

type SupabaseGlobal = typeof globalThis & {
  __herdLedgerSupabase?: ReturnType<typeof createClient>
}

const supabaseGlobal = globalThis as SupabaseGlobal
const authStorageKey = `herdledger-${projectId}-auth-token`
const legacyAuthStorageKey = `sb-${projectId}-auth-token`

// Preserve the current login while moving away from Supabase's default key.
// A dedicated key prevents host/preview clients for the same project from
// competing with HerdLedger's browser auth client.
if (typeof window !== "undefined") {
  try {
    const legacySession = window.localStorage.getItem(legacyAuthStorageKey)
    if (
      legacySession &&
      !window.localStorage.getItem(authStorageKey)
    ) {
      window.localStorage.setItem(authStorageKey, legacySession)
      window.localStorage.removeItem(legacyAuthStorageKey)
    }
  } catch {
    // Supabase will fall back gracefully when browser storage is unavailable.
  }
}

export const supabase =
  supabaseGlobal.__herdLedgerSupabase ??
  createClient(`https://${projectId}.supabase.co`, publicAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: authStorageKey,
    },
  })

supabaseGlobal.__herdLedgerSupabase = supabase
