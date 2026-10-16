import { Info, PawPrint, Plus, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Link } from "react-router"
import { Badge, Field, PageTitle } from "../components/ui"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

type Animal = {
  id: string
  tag_id: string
  name: string | null
  species: string
  breed: string | null
  sex: string
  status: string
}

export default function Animals() {
  const { user } = useAuth()
  const [animals, setAnimals] = useState<Animal[]>([])
  const [query, setQuery] = useState("")
  useEffect(() => {
    if (user)
      void supabase
        .from("animals")
        .select("id, tag_id, name, species, breed, sex, status")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setAnimals(data ?? []))
  }, [user])
  const filtered = animals.filter((a) =>
    `${a.tag_id} ${a.name} ${a.species} ${a.breed}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Digital herd"
        title="My livestock"
        description="Every animal registered to your account, with its live verification status."
        action={
          <Link
            to="/animals/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> Register animal
          </Link>
        }
      />
      <div className="rounded-2xl border border-brand/20 bg-brand-soft p-5">
        <div className="flex gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-brand" />
          <p className="text-sm leading-6 text-brand">
            Each QR code contains only a link to the public verification page
            with this animal’s tag ID. Scanning it opens the live registry
            record so a buyer or official can check identity and theft status;
            it does not store your password, phone number, or payment details.
          </p>
        </div>
      </div>
      <div className="max-w-md">
        <Field
          label="Search livestock"
          placeholder="Tag, name, species, or breed"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {filtered.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((animal) => (
            <article
              key={animal.id}
              className="rounded-2xl border border-line bg-surface p-5 transition hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <PawPrint className="size-6" />
                </span>
                <Badge tone={animal.status === "stolen" ? "danger" : "success"}>
                  {animal.status}
                </Badge>
              </div>
              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {animal.name || animal.species}
                  </h2>
                  <p className="mt-1 font-mono text-xs font-semibold text-brand">
                    {animal.tag_id}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-white p-1.5">
                  <QRCodeSVG
                    value={`${window.location.origin}/verify?tag=${animal.tag_id}`}
                    size={48}
                  />
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted">Breed</dt>
                  <dd className="mt-1 font-medium">
                    {animal.breed || "Not stated"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Sex</dt>
                  <dd className="mt-1 font-medium capitalize">{animal.sex}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      ) : (
        <section className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
          <Search className="size-10 text-muted/40" />
          <h2 className="mt-4 font-display text-xl font-semibold">
            No livestock found
          </h2>
          <p className="mt-2 text-sm text-muted">
            Register your first animal or adjust your search.
          </p>
        </section>
      )}
    </div>
  )
}
