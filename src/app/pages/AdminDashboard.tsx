import {
  ArrowLeftRight,
  CircleAlert,
  Clock3,
  Database,
  PawPrint,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserPlus,
  Users,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Button, PageTitle } from "../components/ui"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

type Analytics = {
  users: {
    total: number
    new_30d: number
    by_role: Record<string, number>
  }
  animals: {
    total: number
    new_30d: number
    active: number
    stolen: number
    listed: number
    by_species: Record<string, number>
  }
  transfers: {
    total: number
    completed: number
    pending: number
    new_30d: number
  }
  safety: {
    active_theft_reports: number
    recovered: number
    fraud_alerts: number
  }
  activity: {
    date: string
    users: number
    animals: number
    transfers: number
  }[]
}

const barHeights = [
  "h-2",
  "h-4",
  "h-6",
  "h-8",
  "h-10",
  "h-12",
  "h-14",
  "h-16",
  "h-20",
  "h-24",
]

const roleLabels: Record<string, string> = {
  owner: "Livestock owners",
  buyer: "Buyers",
  official: "Market officials",
  admin: "Administrators",
}

function SummaryCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string
  value: number
  note: string
  icon: ReactNode
  tone: string
}) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
          {icon}
        </span>
      </div>
      <p className="mt-5 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </article>
  )
}

function DistributionRow({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const percentage = total ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-muted">
          {value} · {percentage}%
        </p>
      </div>
      <progress
        className="mt-2 h-2 w-full overflow-hidden rounded-full accent-brand"
        value={value}
        max={Math.max(total, 1)}
        aria-label={`${label}: ${value} of ${total}`}
      />
    </div>
  )
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    const { data, error: analyticsError } = await supabase.rpc(
      "get_admin_dashboard_analytics",
    )
    setLoading(false)
    if (analyticsError) {
      setError(analyticsError.message)
      return
    }
    setAnalytics(data as Analytics)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const completionRate = analytics?.transfers.total
    ? Math.round(
        (analytics.transfers.completed / analytics.transfers.total) * 100,
      )
    : 0
  const maxDailyActivity = useMemo(
    () =>
      Math.max(
        1,
        ...(analytics?.activity.map(
          (day) => day.users + day.animals + day.transfers,
        ) ?? [1]),
      ),
    [analytics],
  )

  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Administration"
        title={`Platform overview, ${profile?.full_name?.split(" ")[0] ?? "Admin"}`}
        description="Monitor adoption, registry activity, transfers, marketplace supply, and safety signals across HerdLedger."
        action={
          <Button variant="secondary" onClick={load} loading={loading}>
            <RefreshCw className="size-4" /> Refresh data
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger-soft p-5 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && !analytics && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["Users", "Livestock", "Transfers", "Marketplace"].map((label) => (
            <article
              key={label}
              className="animate-pulse rounded-2xl border border-line bg-surface p-5"
            >
              <p className="text-sm text-muted">{label}</p>
              <div className="mt-5 h-9 w-20 rounded-lg bg-canvas" />
              <div className="mt-3 h-3 w-32 rounded bg-canvas" />
            </article>
          ))}
        </section>
      )}

      {analytics && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Registered users"
              value={analytics.users.total}
              note={`+${analytics.users.new_30d} in the last 30 days`}
              icon={<Users className="size-5" />}
              tone="bg-brand-soft text-brand"
            />
            <SummaryCard
              label="Registry animals"
              value={analytics.animals.total}
              note={`+${analytics.animals.new_30d} in the last 30 days`}
              icon={<PawPrint className="size-5" />}
              tone="bg-success-soft text-success"
            />
            <SummaryCard
              label="Completed transfers"
              value={analytics.transfers.completed}
              note={`${completionRate}% completion rate`}
              icon={<ArrowLeftRight className="size-5" />}
              tone="bg-warning-soft text-warning"
            />
            <SummaryCard
              label="Active marketplace"
              value={analytics.animals.listed}
              note="Livestock currently listed"
              icon={<Store className="size-5" />}
              tone="bg-brand-soft text-brand"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <article className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-xl font-semibold">
                    Seven-day platform activity
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    New users, livestock registrations, and transfer requests
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-brand" /> Users
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success" /> Animals
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-accent-strong" />{" "}
                    Transfers
                  </span>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-7 items-end gap-2 sm:gap-4">
                {analytics.activity.map((day) => {
                  const total = day.users + day.animals + day.transfers
                  const heightIndex = Math.min(
                    barHeights.length - 1,
                    Math.max(
                      0,
                      Math.ceil((total / maxDailyActivity) * barHeights.length) -
                        1,
                    ),
                  )
                  return (
                    <div key={day.date} className="grid justify-items-center gap-2">
                      <p className="text-xs font-semibold">{total}</p>
                      <div
                        className={`flex w-full max-w-10 items-end overflow-hidden rounded-t-lg bg-canvas ${barHeights[heightIndex]}`}
                        title={`${day.users} users, ${day.animals} animals, ${day.transfers} transfers`}
                      >
                        <span className="h-full flex-1 bg-brand" />
                        <span className="h-full flex-1 bg-success" />
                        <span className="h-full flex-1 bg-accent-strong" />
                      </div>
                      <p className="text-xs text-muted">
                        {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                          "en-NG",
                          { weekday: "short" },
                        )}
                      </p>
                    </div>
                  )
                })}
              </div>
            </article>

            <article className="rounded-2xl border border-line bg-surface p-6">
              <p className="font-display text-xl font-semibold">User mix</p>
              <p className="mt-1 text-sm text-muted">
                Accounts by assigned platform role
              </p>
              <div className="mt-6 grid gap-5">
                {Object.entries(roleLabels).map(([role, label]) => (
                  <DistributionRow
                    key={role}
                    label={label}
                    value={analytics.users.by_role[role] ?? 0}
                    total={analytics.users.total}
                  />
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <article className="rounded-2xl border border-line bg-surface p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Database className="size-5" />
              </span>
              <p className="mt-5 font-display text-xl font-semibold">
                Registry composition
              </p>
              <div className="mt-5 grid gap-4">
                {["cattle", "goat", "sheep"].map((species) => (
                  <DistributionRow
                    key={species}
                    label={species.charAt(0).toUpperCase() + species.slice(1)}
                    value={analytics.animals.by_species[species] ?? 0}
                    total={analytics.animals.total}
                  />
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-line bg-surface p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-warning-soft text-warning">
                <ShoppingBag className="size-5" />
              </span>
              <p className="mt-5 font-display text-xl font-semibold">
                Transfer pipeline
              </p>
              <div className="mt-5 grid gap-4">
                <DistributionRow
                  label="Completed"
                  value={analytics.transfers.completed}
                  total={analytics.transfers.total}
                />
                <DistributionRow
                  label="Pending"
                  value={analytics.transfers.pending}
                  total={analytics.transfers.total}
                />
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Clock3 className="size-4" />
                  {analytics.transfers.new_30d} requests started in 30 days
                </p>
              </div>
            </article>

            <article className="rounded-2xl border border-line bg-surface p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-danger-soft text-danger">
                <ShieldCheck className="size-5" />
              </span>
              <p className="mt-5 font-display text-xl font-semibold">
                Safety operations
              </p>
              <div className="mt-5 grid gap-4 text-sm">
                <p className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted">
                    <CircleAlert className="size-4" /> Active theft reports
                  </span>
                  <strong>{analytics.safety.active_theft_reports}</strong>
                </p>
                <p className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted">
                    <ShieldCheck className="size-4" /> Recovered animals
                  </span>
                  <strong>{analytics.safety.recovered}</strong>
                </p>
                <p className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted">
                    <UserPlus className="size-4" /> Open fraud alerts
                  </span>
                  <strong>{analytics.safety.fraud_alerts}</strong>
                </p>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  )
}
