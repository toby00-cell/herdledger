import {
  Banknote,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Store,
  Tag,
} from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"
import { Badge, Button, Field, PageTitle, SelectField } from "../components/ui"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

type Listing = {
  animal_id: string
  tag_id: string
  name: string | null
  species: string
  breed: string | null
  sex: string
  asking_price: number
  location: string
  seller_name: string
}
type Animal = {
  id: string
  tag_id: string
  name: string | null
  species: string
}
type Contact = { seller_name: string; phone: string | null }

const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value)

const whatsappNumber = (phone: string) =>
  phone.replace(/\D/g, "").replace(/^0/, "234")

// "1500000" -> "1,500,000" (digits only, no decimals)
const formatWithCommas = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "")
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}
const parsePrice = (value: string) => Number(value.replace(/,/g, ""))

export default function Marketplace() {
  const { user, profile } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [animals, setAnimals] = useState<Animal[]>([])
  const [contacts, setContacts] = useState<Record<string, Contact>>({})
  const [query, setQuery] = useState("")
  const [animalId, setAnimalId] = useState("")
  const [price, setPrice] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const canList = profile?.role === "owner" || profile?.role === "admin"

  const load = async () => {
    const { data } = await supabase.rpc("get_market_listings")
    setListings((data as Listing[] | null) ?? [])
    if (!user || !canList) return
    const [{ data: herd }, { data: account }] = await Promise.all([
      supabase
        .from("animals")
        .select("id, tag_id, name, species")
        .eq("owner_id", user.id)
        .eq("status", "active"),
      supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    ])
    setAnimals(herd ?? [])
    setPhone(account?.phone ?? "")
    if (!animalId && herd?.length) setAnimalId(herd[0].id)
  }

  useEffect(() => {
    void load()
  }, [user, canList])

  const createListing = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    const askingPrice = parsePrice(price)
    if (!askingPrice || askingPrice < 1) {
      return setMessage("Enter a valid asking price.")
    }
    setLoading(true)
    setMessage("")
    const [{ error: profileError }, { error: animalError }] = await Promise.all(
      [
        supabase.from("profiles").update({ phone }).eq("id", user.id),
        supabase
          .from("animals")
          .update({
            is_listed: true,
            asking_price: askingPrice,
            listed_at: new Date().toISOString(),
          })
          .eq("id", animalId)
          .eq("owner_id", user.id),
      ],
    )
    const error = profileError ?? animalError
    setLoading(false)
    setMessage(
      error ? error.message : "Your livestock is now visible to buyers.",
    )
    if (!error) {
      setPrice("")
      await load()
    }
  }

  const reveal = async (animalId: string) => {
    const { data, error } = await supabase.rpc("reveal_listing_contact", {
      animal_id_input: animalId,
    })
    if (error) return setMessage(error.message)
    const contact = (data as Contact[] | null)?.[0]
    if (contact) setContacts((current) => ({ ...current, [animalId]: contact }))
  }
  const removeListing = async (animalId: string) => {
    if (!user) return
    const { error } = await supabase
      .from("animals")
      .update({ is_listed: false, asking_price: null, listed_at: null })
      .eq("id", animalId)
      .eq("owner_id", user.id)
    setMessage(error ? error.message : "Listing removed from the marketplace.")
    if (!error) await load()
  }

  const filtered = listings.filter((listing) =>
    `${listing.name} ${listing.species} ${listing.breed} ${listing.location} ${listing.seller_name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )

  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Livestock marketplace"
        title="Find verified livestock"
        description="Discover animals listed by registered owners, verify the tag, then contact the seller directly."
      />
      <div className="rounded-2xl border border-brand/20 bg-brand-soft p-5">
        <div className="flex gap-3">
          <Banknote className="mt-0.5 size-5 shrink-0 text-brand" />
          <p className="text-sm leading-6 text-brand">
            HerdLedger does not collect payment or deduct commission. Agree on
            inspection and payment with the owner, then accept the digital
            transfer only after payment and the physical handover are confirmed.
            The buyer shares their registered HerdLedger email with the seller,
            who uses it to send the ownership request.
          </p>
        </div>
      </div>
      {canList && (
        <form
          onSubmit={createListing}
          className="grid gap-5 rounded-2xl border border-line bg-surface p-6 lg:grid-cols-[1fr_0.55fr_0.8fr_auto] lg:items-end"
        >
          <SelectField
            label="Livestock to list"
            value={animalId}
            onChange={(event) => setAnimalId(event.target.value)}
            required
          >
            {animals.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.name || animal.species} · {animal.tag_id}
              </option>
            ))}
          </SelectField>
          <Field
            label="Asking price (₦)"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 1,500,000"
            value={price}
            onChange={(event) => setPrice(formatWithCommas(event.target.value))}
            required
          />
          <Field
            label="WhatsApp number"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
          <Button type="submit" loading={loading} disabled={!animals.length}>
            <Store className="size-4" /> Publish listing
          </Button>
        </form>
      )}
      {message && (
        <div className="rounded-xl bg-surface p-3 text-sm text-muted">
          {message}
        </div>
      )}
      <div className="max-w-md">
        <Field
          label="Search marketplace"
          placeholder="Species, breed, owner, or location"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {filtered.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((listing) => {
            const contact = contacts[listing.animal_id]
            const isOwnListing = animals.some(
              (animal) => animal.id === listing.animal_id,
            )
            const whatsappUrl = contact?.phone
              ? `https://wa.me/${whatsappNumber(contact.phone)}?text=${encodeURIComponent(
                  `Hello ${contact.seller_name}, I am interested in ${listing.name || listing.species} (${listing.tag_id}) listed on HerdLedger. My registered buyer email is ${user?.email ?? ""}.`,
                )}`
              : ""
            return (
              <article
                key={listing.animal_id}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <Tag className="size-6" />
                  </span>
                  <Badge tone="success">Verified listing</Badge>
                </div>
                <h2 className="mt-6 font-display text-xl font-semibold">
                  {listing.name || listing.species}
                </h2>
                <p className="mt-1 font-mono text-xs font-semibold text-brand">
                  {listing.tag_id}
                </p>
                <p className="mt-4 font-display text-2xl font-semibold">
                  {formatNaira(listing.asking_price)}
                </p>
                <div className="mt-4 grid gap-2 text-sm text-muted">
                  <p className="flex items-center gap-2">
                    <Store className="size-4" /> {listing.seller_name}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4" /> {listing.location}
                  </p>
                </div>
                <div className="mt-5 border-t border-line pt-5">
                  {isOwnListing ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => removeListing(listing.animal_id)}
                    >
                      Remove my listing
                    </Button>
                  ) : !contact ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => reveal(listing.animal_id)}
                    >
                      <Phone className="size-4" /> Reveal seller contact
                    </Button>
                  ) : contact.phone ? (
                    <Button
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-success px-5 text-sm font-semibold text-white"
                      onClick={() =>
                        window.open(
                          whatsappUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <MessageCircle className="size-4" /> Chat on WhatsApp
                    </Button>
                  ) : (
                    <p className="text-sm text-warning">
                      This owner has not added a phone number yet.
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
          <Search className="size-10 text-muted/40" />
          <h2 className="mt-4 font-display text-xl font-semibold">
            No matching listings
          </h2>
          <p className="mt-2 text-sm text-muted">
            Try another location, breed, or species.
          </p>
        </section>
      )}
    </div>
  )
}