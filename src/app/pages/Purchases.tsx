import { CalendarDays, MapPin, PawPrint, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge, Field, PageTitle } from "../components/ui"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

type Purchase = {
  id: string
  completed_at: string | null
  animal: {
    id: string
    tag_id: string
    name: string | null
    species: string
    breed: string | null
    sex: string
    status: string
    registration_location: string
  } | null
}

export default function Purchases() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!user) return
    void supabase
      .from("ownership_transfers")
      .select(
        "id, completed_at, animal:animals(id, tag_id, name, species, breed, sex, status, registration_location)",
      )
      .eq("to_owner_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .then(({ data }) => setPurchases(data as unknown as Purchase[] ?? []))
  }, [user])

  const filtered = purchases.filter(({ animal }) =>
    `${animal?.tag_id} ${animal?.name} ${animal?.species} ${animal?.breed}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )

  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Purchase records"
        title="My purchased livestock"
        description="Livestock you accepted through a completed HerdLedger ownership transfer."
      />
      <div className="max-w-md">
        <Field
          label="Search purchase records"
          placeholder="Tag, name, species, or breed"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {filtered.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ id, completed_at, animal }) =>
            animal ? (
              <article
                key={id}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <PawPrint className="size-6" />
                  </span>
                  <Badge
                    tone={animal.status === "stolen" ? "danger" : "success"}
                  >
                    {animal.status}
                  </Badge>
                </div>
                <h2 className="mt-6 font-display text-xl font-semibold">
                  {animal.name || animal.species}
                </h2>
                <p className="mt-1 font-mono text-xs font-semibold text-brand">
                  {animal.tag_id}
                </p>
                <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-sm">
                  <div className="flex items-center gap-2 text-muted">
                    <CalendarDays className="size-4" />
                    <span>
                      Purchased{" "}
                      {completed_at
                        ? new Date(completed_at).toLocaleDateString()
                        : "recently"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted">
                    <MapPin className="size-4" />
                    <span>{animal.registration_location}</span>
                  </div>
                </dl>
              </article>
            ) : null,
          )}
        </section>
      ) : (
        <section className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
          <Search className="size-10 text-muted/40" />
          <h2 className="mt-4 font-display text-xl font-semibold">
            No completed purchases yet
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            A livestock record appears here after you accept an incoming
            ownership transfer.
          </p>
        </section>
      )}
    </div>
  )
}
