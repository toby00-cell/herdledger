import { ArrowLeftRight, Check, Clock3, Send } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"
import { Badge, Button, Field, PageTitle, SelectField } from "../components/ui"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

type Animal = { id: string tag_id: string name: string | null species: string }
type Transfer = {
  id: string
  animal_id: string
  status: string
  created_at: string
  from_owner_id: string
  to_owner_id: string
}

export default function Transfers() {
  const { user, profile } = useAuth()
  const [animals, setAnimals] = useState<Animal[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [animalId, setAnimalId] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const load = async () => {
    if (!user) return
    const [a, t] = await Promise.all([
      supabase
        .from("animals")
        .select("id, tag_id, name, species")
        .eq("owner_id", user.id)
        .eq("status", "active"),
      supabase
        .from("ownership_transfers")
        .select("id, animal_id, status, created_at, from_owner_id, to_owner_id")
        .or(`from_owner_id.eq.${user.id},to_owner_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
    ])
    setAnimals(a.data ?? [])
    setTransfers(t.data ?? [])
    if (!animalId && a.data?.length) setAnimalId(a.data[0].id)
  }
  useEffect(() => {
    void load()
  }, [user])
  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setLoading(true)
    setMessage("")
    const { data: recipientId, error: lookupError } = await supabase.rpc(
      "find_transfer_recipient",
      { email_input: email.toLowerCase() },
    )
    if (lookupError || !recipientId) {
      setMessage("No registered account was found for that email.")
      setLoading(false)
      return
    }
    const { error } = await supabase
      .from("ownership_transfers")
      .insert({
        animal_id: animalId,
        from_owner_id: user.id,
        to_owner_id: recipientId,
      })
    setLoading(false)
    setMessage(error ? error.message : "Transfer request sent successfully.")
    if (!error) {
      setEmail("")
      await load()
    }
  }
  const accept = async (id: string) => {
    const { error } = await supabase.rpc("accept_ownership_transfer", {
      transfer_id_input: id,
    })
    setMessage(error ? error.message : "Ownership transfer completed.")
    await load()
  }
  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Ownership"
        title="Transfers"
        description="Send and accept ownership securely. Every completed transfer creates a permanent ledger entry."
      />
      <section
        className={`grid gap-5 ${profile?.role === "owner" || profile?.role === "admin" ? "xl:grid-cols-[0.8fr_1.2fr]" : ""}`}
      >
        {(profile?.role === "owner" || profile?.role === "admin") && (
          <form
          onSubmit={create}
          className="h-fit rounded-2xl border border-line bg-surface p-6"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
            <Send className="size-5" />
          </span>
          <h2 className="mt-5 font-display text-xl font-semibold">
            Start a transfer
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            The recipient must already have a HerdLedger account.
          </p>
          {message && (
            <div className="mt-5 rounded-xl bg-canvas p-3 text-sm text-muted">
              {message}
            </div>
          )}
          <div className="mt-6 grid gap-5">
            <SelectField
              label="Animal"
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              required
            >
              {animals.length ? (
                animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.species} · {a.tag_id}
                  </option>
                ))
              ) : (
                <option value="">No active animals</option>
              )}
            </SelectField>
            <Field
              label="New owner's email"
              type="email"
              placeholder="buyer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" loading={loading} disabled={!animals.length}>
              Send transfer request
            </Button>
          </div>
          </form>
        )}
        <div className="rounded-2xl border border-line bg-surface">
          <div className="border-b border-line p-6">
            <h2 className="font-display text-xl font-semibold">
              Transfer activity
            </h2>
            <p className="mt-1 text-sm text-muted">
              Incoming and outgoing requests
            </p>
          </div>
          {transfers.length ? (
            <div className="divide-y divide-line">
              {transfers.map((t) => {
                const incoming = t.to_owner_id === user?.id
                return (
                  <div
                    key={t.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas text-muted">
                      {t.status === "completed" ? (
                        <Check className="size-5" />
                      ) : (
                        <Clock3 className="size-5" />
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {incoming
                          ? "Incoming ownership request"
                          : "Outgoing ownership request"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {new Date(t.created_at).toLocaleDateString()} · Animal{" "}
                        {t.animal_id.slice(0, 8)}
                      </p>
                    </div>
                    <Badge
                      tone={t.status === "completed" ? "success" : "warning"}
                    >
                      {t.status}
                    </Badge>
                    {incoming && t.status === "pending" && (
                      <Button onClick={() => accept(t.id)}>Accept</Button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid place-items-center px-5 py-16 text-center">
              <ArrowLeftRight className="size-10 text-muted/40" />
              <p className="mt-4 font-semibold">No transfers yet</p>
              <p className="mt-2 text-sm text-muted">
                New ownership activity will appear here.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
