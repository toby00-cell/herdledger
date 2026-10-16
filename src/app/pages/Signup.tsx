import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { type FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router"
import Brand from "../components/Brand"
import { Button, Field, SelectField } from "../components/ui"
import { supabase } from "../lib/supabase"

// "okafor" -> "Okafor", "adeyemi-ojo" -> "Adeyemi-Ojo", "o'neil" -> "O'Neil"
const formatName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_, sep: string, char: string) =>
      sep + char.toUpperCase(),
    )

export default function Signup() {
  const [form, setForm] = useState({
    surname: "",
    firstName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "owner",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()

  const passwordsMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")

    const surname = formatName(form.surname)
    const firstName = formatName(form.firstName)
    if (!surname || !firstName) {
      return setError("Enter both your surname and first name.")
    }
    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.")
    }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          surname,
          first_name: firstName,
          full_name: `${firstName} ${surname}`,
          role: form.role,
          phone: form.phone,
        },
      },
    })
    setLoading(false)
    if (authError) return setError(authError.message)
    if (data.session) navigate("/dashboard")
    else setSent(true)
  }
  return (
    <div className="min-h-screen bg-cream">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Brand />
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back home
        </Link>
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <section className="pt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            Join the registry
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Start building a trusted record for your herd.
          </h1>
          <p className="mt-5 leading-7 text-muted">
            Your account gives you a secure place to register animals, prove
            ownership, and complete transparent transfers.
          </p>
          <div className="mt-8 grid gap-4">
            {[
              "Unique QR identity for every animal",
              "Permanent ownership and transfer history",
              "Instant theft alerts visible to verifiers",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 text-sm font-medium"
              >
                <CheckCircle2 className="size-5 text-brand" /> {item}
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-line bg-surface p-6 shadow-xl shadow-ink/5 sm:p-9">
          {sent ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto size-12 text-brand" />
              <h2 className="mt-5 font-display text-2xl font-semibold">
                Check your email
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
                We sent a confirmation link to {form.email}. Confirm your
                address, then log in.
              </p>
              <Link
                to="/login"
                className="mt-7 inline-block font-semibold text-brand"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-semibold">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-muted">
                Use accurate details for your ownership records.
              </p>
              <form className="mt-7 grid gap-5" onSubmit={submit}>
                {error && (
                  <div className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-sm text-danger">
                    {error}
                  </div>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Surname"
                    placeholder="e.g. Okafor"
                    value={form.surname}
                    onChange={(event) =>
                      setForm({ ...form, surname: event.target.value })
                    }
                    onBlur={() =>
                      setForm((current) => ({
                        ...current,
                        surname: formatName(current.surname),
                      }))
                    }
                    autoComplete="family-name"
                    required
                  />
                  <Field
                    label="First name"
                    placeholder="e.g. Chinedu"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm({ ...form, firstName: event.target.value })
                    }
                    onBlur={() =>
                      setForm((current) => ({
                        ...current,
                        firstName: formatName(current.firstName),
                      }))
                    }
                    autoComplete="given-name"
                    required
                  />
                </div>
                <Field
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  required
                />
                <Field
                  label="WhatsApp phone number"
                  type="tel"
                  placeholder="e.g. +234 801 234 5678"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  required={form.role === "owner"}
                  hint="Required for owners who want buyers to contact them."
                />
                <SelectField
                  label="How will you use HerdLedger?"
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value })
                  }
                >
                  <option value="owner">Livestock owner</option>
                  <option value="buyer">Buyer / verifier</option>
                  <option value="official">Market official</option>
                </SelectField>
                <Field
                  label="Password"
                  type="password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  autoComplete="new-password"
                  required
                  hint="Use 8 or more characters with a number."
                />
                <div>
                  <Field
                    label="Confirm password"
                    type="password"
                    placeholder="Re-enter your password"
                    minLength={8}
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm({ ...form, confirmPassword: event.target.value })
                    }
                    autoComplete="new-password"
                    required
                  />
                  {passwordsMismatch && (
                    <p className="mt-2 text-xs font-medium text-danger">
                      Passwords do not match.
                    </p>
                  )}
                  {form.confirmPassword.length > 0 && !passwordsMismatch && (
                    <p className="mt-2 text-xs font-medium text-success">
                      Passwords match.
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  loading={loading}
                  disabled={passwordsMismatch}
                  className="mt-1 w-full"
                >
                  Create secure account
                </Button>
                <p className="text-center text-xs leading-5 text-muted">
                  This research prototype should not store national ID numbers
                  or other highly sensitive personal information.
                </p>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  )
}