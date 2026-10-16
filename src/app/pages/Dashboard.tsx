import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  PawPrint,
  Plus,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Boxes,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router"
import { Badge, PageTitle } from "../components/ui"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"
import AdminDashboard from "./AdminDashboard"

type Animal = {
  id: string
  tag_id: string
  name: string | null
  species: string
  breed: string | null
  status: string
  created_at: string
}

function OwnerDashboard() {
  const { user, profile } = useAuth()
  const [animals, setAnimals] = useState<Animal[]>([])
  const [pending, setPending] = useState(0)
  useEffect(() => {
    if (!user) return
    void Promise.all([
      supabase
        .from("animals")
        .select("id, tag_id, name, species, breed, status, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("ownership_transfers")
        .select("*", { count: "exact", head: true })
        .eq("to_owner_id", user.id)
        .eq("status", "pending"),
    ]).then(([a, t]) => {
      setAnimals(a.data ?? [])
      setPending(t.count ?? 0)
    })
  }, [user])
  const stats = [
    {
      label: "Registered animals",
      value: animals.length,
      icon: PawPrint,
      color: "text-brand bg-brand-soft",
    },
    {
      label: "Active & verified",
      value: animals.filter((a) => a.status === "active").length,
      icon: CheckCircle2,
      color: "text-success bg-success-soft",
    },
    {
      label: "Pending transfers",
      value: pending,
      icon: Clock3,
      color: "text-warning bg-warning-soft",
    },
    {
      label: "Theft alerts",
      value: animals.filter((a) => a.status === "stolen").length,
      icon: CircleAlert,
      color: "text-danger bg-danger-soft",
    },
  ]
  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Owner dashboard"
        title={`Good day, ${profile?.full_name?.split(" ")[0] ?? "Owner"}`}
        description="Here is the current picture of your registered herd and ownership activity."
        action={
          <Link
            to="/animals/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> Register animal
          </Link>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-line bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">{item.label}</p>
              <span
                className={`grid size-9 place-items-center rounded-xl ${item.color}`}
              >
                <item.icon className="size-4" />
              </span>
            </div>
            <p className="mt-5 font-display text-3xl font-semibold">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-muted">Live registry count</p>
          </article>
        ))}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.7fr]">
        <div className="rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line p-5">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Recently registered
              </h2>
              <p className="mt-1 text-sm text-muted">
                Your latest livestock records
              </p>
            </div>
            <Link to="/animals" className="text-sm font-semibold text-brand">
              View all
            </Link>
          </div>
          {animals.length ? (
            <div className="divide-y divide-line">
              {animals.map((animal) => (
                <div key={animal.id} className="flex items-center gap-4 p-5">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                    <PawPrint className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {animal.name || `${animal.species} ${animal.tag_id}`}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {animal.breed || animal.species} · {animal.tag_id}
                    </p>
                  </div>
                  <Badge
                    tone={animal.status === "stolen" ? "danger" : "success"}
                  >
                    {animal.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center px-5 py-14 text-center">
              <PawPrint className="size-9 text-muted/40" />
              <p className="mt-4 font-semibold">
                Your digital herd starts here
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                Register your first animal to generate its permanent identity
                and QR tag.
              </p>
              <Link
                to="/animals/new"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand"
              >
                Register an animal <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
        <aside className="rounded-2xl bg-brand p-6 text-white">
          <span className="grid size-11 place-items-center rounded-xl bg-white/10">
            <ScanLine className="size-5 text-accent" />
          </span>
          <h2 className="mt-8 font-display text-2xl font-semibold">
            Check before you buy
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Enter any HerdLedger tag to confirm its current status, transfer
            history, and theft alerts.
          </p>
          <Link
            to="/verify"
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-accent"
          >
            Open public verifier <ArrowRight className="size-4" />
          </Link>
        </aside>
      </section>
    </div>
  )
}

function BuyerDashboard() {
  const { user, profile } = useAuth()
  const [pending, setPending] = useState(0)
  const [completed, setCompleted] = useState(0)

  useEffect(() => {
    if (!user) return
    void Promise.all([
      supabase
        .from("ownership_transfers")
        .select("*", { count: "exact", head: true })
        .eq("to_owner_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("ownership_transfers")
        .select("*", { count: "exact", head: true })
        .eq("to_owner_id", user.id)
        .eq("status", "completed"),
    ]).then(([pendingResult, completedResult]) => {
      setPending(pendingResult.count ?? 0)
      setCompleted(completedResult.count ?? 0)
    })
  }, [user])

  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Buyer dashboard"
        title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? "Buyer"}`}
        description="Verify livestock before payment and securely accept ownership transfers from registered owners."
        action={
          <Link
            to="/verify"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white"
          >
            <ScanLine className="size-4" /> Verify livestock
          </Link>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RoleStat
          label="Incoming transfers"
          value={pending}
          note="Waiting for your decision"
          icon={<Clock3 className="size-5" />}
          color="bg-warning-soft text-warning"
        />
        <RoleStat
          label="Completed purchases"
          value={completed}
          note="Accepted ownership records"
          icon={<CheckCircle2 className="size-5" />}
          color="bg-success-soft text-success"
        />
        <RoleStat
          label="Verification"
          value={24}
          note="Available hours every day"
          icon={<ShieldCheck className="size-5" />}
          color="bg-brand-soft text-brand"
        />
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <ActionCard
          icon={<ScanLine className="size-6" />}
          title="Check before you pay"
          body="Confirm the animal identity, current status, and theft warnings using the tag attached to the animal."
          to="/verify"
          action="Verify a livestock tag"
        />
        <ActionCard
          icon={<PawPrint className="size-6" />}
          title="Browse livestock for sale"
          body="Search opt-in listings by owner, breed, or location and reveal contact details only when you are interested."
          to="/marketplace"
          action="Open marketplace"
        />
        <ActionCard
          icon={<CheckCircle2 className="size-6" />}
          title="View purchased livestock"
          body="See the animals and permanent records from ownership transfers you have completed."
          to="/purchases"
          action="Open purchase records"
        />
        <ActionCard
          icon={<Boxes className="size-6" />}
          title="Buy livestock in bulk"
          body="Publish one quantity request and compare grouped offers from one or more registered livestock owners."
          to="/bulk-orders"
          action="Create a bulk request"
        />
        <ActionCard
          icon={<ArrowLeftRight className="size-6" />}
          title="Review ownership requests"
          body="Only accept a transfer after checking the physical animal and confirming the seller’s identity."
          to="/transfers"
          action="Open my transfers"
        />
      </section>
    </div>
  )
}

function OfficialDashboard() {
  const { profile } = useAuth()
  const [animals, setAnimals] = useState(0)
  const [theftAlerts, setTheftAlerts] = useState(0)
  const [fraudAlerts, setFraudAlerts] = useState<{
    id: string
    reason: string
    risk_score: number
  }[]>([])

  useEffect(() => {
    void Promise.all([
      supabase.from("animals").select("*", { count: "exact", head: true }),
      supabase
        .from("theft_reports")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("fraud_alerts")
        .select("id, reason, risk_score")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([animalResult, theftResult, fraudResult]) => {
      setAnimals(animalResult.count ?? 0)
      setTheftAlerts(theftResult.count ?? 0)
      setFraudAlerts(fraudResult.data ?? [])
    })
  }, [])

  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Market official dashboard"
        title={`Market oversight, ${profile?.full_name?.split(" ")[0] ?? "Official"}`}
        description="Monitor livestock records, theft warnings, and suspicious rapid-resale patterns."
        action={
          <Link
            to="/verify"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white"
          >
            <ScanLine className="size-4" /> Inspect a tag
          </Link>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RoleStat
          label="Registry animals"
          value={animals}
          note="Publicly verifiable records"
          icon={<PawPrint className="size-5" />}
          color="bg-brand-soft text-brand"
        />
        <RoleStat
          label="Active theft alerts"
          value={theftAlerts}
          note="Warnings requiring attention"
          icon={<ShieldAlert className="size-5" />}
          color="bg-danger-soft text-danger"
        />
        <RoleStat
          label="Fraud warnings"
          value={fraudAlerts.length}
          note="Unresolved risk signals"
          icon={<TriangleAlert className="size-5" />}
          color="bg-warning-soft text-warning"
        />
      </section>
      <section className="rounded-2xl border border-line bg-surface">
        <div className="border-b border-line p-6">
          <h2 className="font-display text-xl font-semibold">
            Suspicious activity
          </h2>
          <p className="mt-1 text-sm text-muted">
            Automated rapid-transfer warnings
          </p>
        </div>
        {fraudAlerts.length ? (
          <div className="divide-y divide-line">
            {fraudAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-4 p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-warning-soft text-warning">
                  <TriangleAlert className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{alert.reason}</p>
                  <p className="mt-1 text-xs text-muted">
                    Automated ledger monitoring
                  </p>
                </div>
                <Badge tone="warning">Risk {alert.risk_score}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid place-items-center px-5 py-14 text-center">
            <ShieldCheck className="size-9 text-success" />
            <p className="mt-4 font-semibold">No unresolved fraud alerts</p>
            <p className="mt-2 text-sm text-muted">
              New risk signals will appear here automatically.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function RoleStat({
  label,
  value,
  note,
  icon,
  color,
}: {
  label: string
  value: number
  note: string
  icon: ReactNode
  color: string
}) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={`grid size-10 place-items-center rounded-xl ${color}`}>
          {icon}
        </span>
      </div>
      <p className="mt-5 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </article>
  )
}

function ActionCard({
  icon,
  title,
  body,
  to,
  action,
}: {
  icon: ReactNode
  title: string
  body: string
  to: string
  action: string
}) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-6">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        {icon}
      </span>
      <h2 className="mt-6 font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
      <Link
        to={to}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand"
      >
        {action} <ArrowRight className="size-4" />
      </Link>
    </article>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  if (profile?.role === "admin") return <AdminDashboard />
  if (profile?.role === "buyer") return <BuyerDashboard />
  if (profile?.role === "official") {
    return <OfficialDashboard />
  }
  return <OwnerDashboard />
}
