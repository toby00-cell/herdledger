import {
  ArrowLeftRight,
  Bell,
  Boxes,
  ChevronDown,
  CircleGauge,
  ClipboardPlus,
  LogOut,
  Menu,
  PackageCheck,
  PanelsTopLeft,
  Search,
  Store,
  ShieldAlert,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"
import Brand from "./Brand"
import { Button } from "./ui"

const ownerNav = [
  { to: "/dashboard", label: "Overview", icon: CircleGauge },
  { to: "/animals", label: "My livestock", icon: ClipboardPlus },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/bulk-orders", label: "Bulk opportunities", icon: Boxes },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/reports", label: "Theft reports", icon: ShieldAlert },
  { to: "/verify", label: "Verify a tag", icon: Search },
]

const buyerNav = [
  { to: "/dashboard", label: "Buyer overview", icon: CircleGauge },
  { to: "/marketplace", label: "Find livestock", icon: Store },
  { to: "/bulk-orders", label: "Bulk orders", icon: Boxes },
  { to: "/purchases", label: "My purchases", icon: PackageCheck },
  { to: "/transfers", label: "My transfers", icon: ArrowLeftRight },
  { to: "/verify", label: "Verify livestock", icon: Search },
]

const officialNav = [
  { to: "/dashboard", label: "Market overview", icon: CircleGauge },
  { to: "/reports", label: "Theft alerts", icon: ShieldAlert },
  { to: "/verify", label: "Verify livestock", icon: Search },
]

const adminNav = [
  { to: "/dashboard", label: "Platform analytics", icon: PanelsTopLeft },
  { to: "/reports", label: "Theft operations", icon: ShieldAlert },
  { to: "/verify", label: "Verify livestock", icon: Search },
]

export default function AppShell() {
  const [open, setOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<{
    id: string
    title: string
    message: string
    link: string | null
    read_at: string | null
    created_at: string
  }[]>([])
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!user) return
    void supabase
      .from("notifications")
      .select("id, title, message, link, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setNotifications(data ?? []))
  }, [user])
  const openNotifications = async () => {
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)
    if (!nextOpen || !user || !notifications.some((item) => !item.read_at))
      return
    const readAt = new Date().toISOString()
    await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", user.id)
      .is("read_at", null)
    setNotifications((items) =>
      items.map((item) => ({ ...item, read_at: item.read_at ?? readAt })),
    )
  }
  const nav =
    profile?.role === "admin"
      ? adminNav
      : profile?.role === "buyer"
      ? buyerNav
      : profile?.role === "official"
        ? officialNav
        : ownerNav
  const logout = async () => {
    await signOut()
    navigate("/")
  }
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-ink p-5 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Brand inverse />
          <Button
            variant="quiet"
            className="text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </Button>
        </div>
        <nav className="mt-10 grid gap-1.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-ink"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-white/40">
            Signed in as
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-white">
            {profile?.full_name ?? user?.email}
          </p>
          <p className="mt-0.5 text-xs capitalize text-white/50">
            {profile?.role ?? "owner"} account
          </p>
          <Button
            variant="quiet"
            className="mt-3 w-full justify-start text-white/70 hover:bg-white/10 hover:text-white"
            onClick={logout}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-line bg-surface/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="quiet"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>
            <p className="hidden text-sm text-muted sm:block">
              Protecting livestock, preserving livelihoods
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <Button
              variant="quiet"
              aria-label="Notifications"
              onClick={openNotifications}
              className="relative"
            >
              <Bell className="size-5" />
              {notifications.some((item) => !item.read_at) && (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-danger" />
              )}
            </Button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
                <div className="border-b border-line p-4">
                  <p className="font-semibold">Notifications</p>
                </div>
                {notifications.length ? (
                  <div className="max-h-96 divide-y divide-line overflow-y-auto">
                    {notifications.map((notification) => (
                      <Button
                        key={notification.id}
                        variant="quiet"
                        className="h-auto w-full justify-start rounded-none p-4 text-left"
                        onClick={() => {
                          setNotificationsOpen(false)
                          if (notification.link) navigate(notification.link)
                        }}
                      >
                        <span className="block text-sm font-semibold">
                          {notification.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">
                          {notification.message}
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="p-6 text-center text-sm text-muted">
                    No notifications yet
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1.5">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand">
                {(profile?.full_name ?? user?.email ?? "U")
                  .charAt(0)
                  .toUpperCase()}
              </span>
              <ChevronDown className="size-4 text-muted" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-5 sm:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
