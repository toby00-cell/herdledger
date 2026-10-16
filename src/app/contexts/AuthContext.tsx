import type { Session, User } from "@supabase/supabase-js"
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from "react"
import { supabase } from "../lib/supabase"

type Profile = {
  id: string
  full_name: string
  role: "owner" | "buyer" | "official" | "admin"
}
type AuthValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

type AuthGlobal = typeof globalThis & {
  __herdLedgerAuthContext?: Context<AuthValue | undefined>
}

const authGlobal = globalThis as AuthGlobal
const AuthContext =
  authGlobal.__herdLedgerAuthContext ??
  createContext<AuthValue | undefined>(undefined)

authGlobal.__herdLedgerAuthContext = AuthContext

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sync = async (next: Session | null) => {
      setSession(next)
      if (!next?.user) {
        setProfile(null)
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", next.user.id)
        .maybeSingle()
      setProfile(
        data ?? {
          id: next.user.id,
          full_name:
            next.user.user_metadata.full_name ??
            next.user.email?.split("@")[0] ??
            "Livestock owner",
          role: next.user.user_metadata.role ?? "owner",
        },
      )
      setLoading(false)
    }
    supabase.auth.getSession().then(({ data }) => sync(data.session))
    const { data } = supabase.auth.onAuthStateChange(
      (_event, next) => void sync(next),
    )
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [session, profile, loading],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside AuthProvider")
  return value
}
