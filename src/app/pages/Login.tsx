import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react"
import { type FormEvent, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import Brand from "../components/Brand"
import { Button, Field } from "../components/ui"
import { supabase } from "../lib/supabase"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const location = useLocation()
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (authError) return setError(authError.message)
    navigate((location.state as { from?: string } | null)?.from ?? "/dashboard")
  }
  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-ink lg:block">
        <img
          src="https://images.unsplash.com/photo-1763231228595-12e443569896?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200"
          alt="A livestock keeper tending a cow"
          className="absolute inset-0 size-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <LockKeyhole className="size-9 text-accent" />
          <blockquote className="mt-6 max-w-xl font-display text-3xl font-medium leading-snug">
            “Proof of ownership should be stronger than a piece of paper.”
          </blockquote>
          <p className="mt-4 text-sm text-white/60">
            Secure digital livestock registry
          </p>
        </div>
      </section>
      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Brand />
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" /> Back home
          </Link>
        </div>
        <div className="my-auto w-full max-w-md self-center py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            Welcome back
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
            Log in to your herd
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Continue managing your animals, transfers, and theft alerts.
          </p>
          <form className="mt-8 grid gap-5" onSubmit={submit}>
            {error && (
              <div className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-sm text-danger">
                {error}
              </div>
            )}
            <Field
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <div className="relative">
              <Field
                label="Password"
                type={visible ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <Button
                type="button"
                variant="quiet"
                className="absolute bottom-0 right-1"
                onClick={() => setVisible(!visible)}
                aria-label="Toggle password visibility"
              >
                {visible ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            <Button type="submit" loading={loading} className="mt-1 w-full">
              Log in
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            New to HerdLedger?{" "}
            <Link
              to="/signup"
              className="font-semibold text-brand hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
