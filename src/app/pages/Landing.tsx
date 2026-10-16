import {
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  History,
  LockKeyhole,
  Menu,
  QrCode,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import Brand from "../components/Brand"
import { Button } from "../components/ui"

const heroImage =
  "https://images.unsplash.com/photo-1697466587321-25064c828e69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600"
const features = [
  {
    icon: QrCode,
    title: "A unique identity",
    body: "Give every animal a scannable digital tag linked to its breed, markings, owner, and history.",
  },
  {
    icon: History,
    title: "Tamper-evident history",
    body: "Each registration and transfer becomes part of an append-only, hash-chained ownership ledger.",
  },
  {
    icon: ShieldCheck,
    title: "Rapid theft alerts",
    body: "Flag missing livestock immediately so buyers and market officials see the warning before a sale.",
  },
]

export default function Landing() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
          <Brand inverse />
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 md:flex">
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <Link to="/verify" className="transition hover:text-white">
              Verify animal
            </Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-accent-strong"
            >
              Create account
            </Link>
          </div>
          <Button
            variant="quiet"
            className="text-white hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
        {open && (
          <div className="mx-5 grid gap-2 rounded-2xl bg-surface p-4 shadow-xl md:hidden">
            <a href="#how-it-works" className="rounded-lg p-3 font-medium">
              How it works
            </a>
            <Link to="/verify" className="rounded-lg p-3 font-medium">
              Verify animal
            </Link>
            <Link to="/login" className="rounded-lg p-3 font-medium">
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-brand p-3 text-center font-semibold text-white"
            >
              Create account
            </Link>
          </div>
        )}
      </header>
      <main>
        <section className="relative isolate min-h-screen overflow-hidden bg-ink">
          <img
            src={heroImage}
            alt="A Nigerian livestock keeper standing with a herd of cattle"
            className="absolute inset-0 -z-20 size-full object-cover object-center opacity-55"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/20" />
          <div className="mx-auto flex min-h-screen max-w-7xl items-end px-5 pb-20 pt-36 sm:px-8 lg:items-center lg:pb-0">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
                <LockKeyhole className="size-4 text-accent" />
                Secure livestock identity for Nigeria
              </div>
              <h1 className="font-display text-5xl font-semibold leading-none tracking-tight text-white sm:text-6xl lg:text-7xl">
                Every animal deserves a history that can’t disappear.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
                A trusted digital registry that helps owners prove ownership,
                complete safer transfers, and protect livestock from theft.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-ink transition hover:bg-accent-strong"
                >
                  Register your livestock <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/verify"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <ScanLine className="size-4" /> Verify a tag
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/65">
                {[
                  "Free to verify",
                  "Built for mobile",
                  "Ownership protected",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-accent" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="border-b border-line bg-surface">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-line px-5 py-8 sm:px-8 lg:grid-cols-4">
            {[
              ["₦11.9tn", "Livestock contribution"],
              ["$432m", "Lost to rustling yearly"],
              ["SHA-256", "Ledger verification"],
              ["24/7", "Public tag checks"],
            ].map(([value, label]) => (
              <div key={label} className="px-4 py-3 text-center">
                <p className="font-display text-2xl font-semibold text-brand sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-xs text-muted sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="features" className="px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-brand">
                Built for trust
              </p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                A permanent record from first tag to final transfer.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted">
                HerdLedger replaces fragile paper receipts with a verifiable
                record that travels with each animal.
              </p>
            </div>
            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className="group rounded-3xl border border-line bg-surface p-7 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                      <feature.icon className="size-6" />
                    </span>
                    <span className="font-display text-sm text-muted/50">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-8 font-display text-2xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-3 leading-7 text-muted">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          id="how-it-works"
          className="bg-brand px-5 py-24 text-white sm:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">
                Simple by design
              </p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                From registration to a safer market sale.
              </h2>
              <p className="mt-6 leading-7 text-white/65">
                Owners, buyers, and market officials all see the information
                they need without exposing private account data.
              </p>
              <Link
                to="/verify"
                className="mt-8 inline-flex items-center gap-2 font-semibold text-accent"
              >
                Try public verification <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-3">
              {[
                [
                  "Create the animal record",
                  "Add species, breed, sex, markings, age, and a clear photograph.",
                ],
                [
                  "Attach the generated QR tag",
                  "Print or display the unique identity tag on a durable physical label.",
                ],
                [
                  "Verify before every transfer",
                  "A buyer checks ownership, theft status, and the ledger before accepting.",
                ],
              ].map(([title, body], index) => (
                <div
                  key={title}
                  className="flex gap-5 rounded-2xl border border-white/15 bg-white/5 p-5"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-display font-bold text-ink">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-white/60">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="px-5 py-24 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center rounded-3xl bg-accent p-10 text-center sm:p-16">
            <Fingerprint className="size-12 text-brand" />
            <h2 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-tight">
              Make ownership easier to prove and theft harder to hide.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-ink/65">
              Create your account and register the first animal in your digital
              herd.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-bold text-white"
            >
              Get started free <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-line bg-surface px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <p>Graduation research prototype · Nigeria · 2026</p>
        </div>
      </footer>
    </div>
  )
}
