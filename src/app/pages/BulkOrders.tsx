import {
  Boxes,
  CalendarDays,
  Check,
  ClipboardList,
  MapPin,
  MessageCircle,
  PackageCheck,
  PawPrint,
  Send,
  Users,
} from "lucide-react"
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import {
  Badge,
  Button,
  Field,
  PageTitle,
  SelectField,
  TextareaField,
} from "../components/ui"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

type PurchaseRequest = {
  id: string
  buyer_id: string
  request_ref: string
  species: string
  breed: string | null
  quantity: number
  sex_preference: string
  max_price_per_animal: number | null
  location: string
  required_by: string | null
  notes: string | null
  status: string
  created_at: string
}

type BulkOffer = {
  id: string
  request_id: string
  order_ref: string
  owner_name: string
  owner_phone: string | null
  animal_count: number
  animals: {
    id: string
    tag_id: string
    name: string | null
    species: string
    breed: string | null
    sex: string
    status: string
  }[]
  total_price: number
  message: string | null
  status: string
  created_at: string
}

type Animal = {
  id: string
  tag_id: string
  name: string | null
  species: string
  breed: string | null
  sex: string
}

const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value)

const statusTone = (status: string) => {
  if (status === "completed") return "success" as const
  if (status === "cancelled" || status === "rejected") return "danger" as const
  if (status === "matched" || status === "accepted") return "warning" as const
  return "neutral" as const
}

export default function BulkOrders() {
  const { user, profile } = useAuth()
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [offers, setOffers] = useState<BulkOffer[]>([])
  const [animals, setAnimals] = useState<Animal[]>([])
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [offerPrices, setOfferPrices] = useState<Record<string, string>>({})
  const [offerMessages, setOfferMessages] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    species: "cattle",
    breed: "",
    quantity: "10",
    sexPreference: "any",
    maxPrice: "",
    location: "",
    requiredBy: "",
    notes: "",
  })
  const [message, setMessage] = useState("")
  const [loadingId, setLoadingId] = useState("")
  const isBuyer = profile?.role === "buyer"
  const isOwner = profile?.role === "owner"

  const load = async () => {
    if (!user) return
    const requestQuery = supabase
      .from("purchase_requests")
      .select(
        "id, buyer_id, request_ref, species, breed, quantity, sex_preference, max_price_per_animal, location, required_by, notes, status, created_at",
      )
      .order("created_at", { ascending: false })
    if (isBuyer) requestQuery.eq("buyer_id", user.id)
    else requestQuery.in("status", ["open", "matched"])

    const jobs = [requestQuery, supabase.rpc("get_bulk_offers")]
    if (isOwner) {
      jobs.push(
        supabase
          .from("animals")
          .select("id, tag_id, name, species, breed, sex")
          .eq("owner_id", user.id)
          .eq("status", "active"),
      )
    }
    const [requestResult, offerResult, animalResult] = await Promise.all(jobs)
    setRequests((requestResult.data as PurchaseRequest[]) ?? [])
    setOffers((offerResult.data as BulkOffer[]) ?? [])
    setAnimals((animalResult?.data as Animal[]) ?? [])
  }

  useEffect(() => {
    void load()
  }, [user, isBuyer, isOwner])

  const createRequest = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setLoadingId("create")
    setMessage("")
    const { error } = await supabase.from("purchase_requests").insert({
      buyer_id: user.id,
      species: form.species,
      breed: form.breed || null,
      quantity: Number(form.quantity),
      sex_preference: form.sexPreference,
      max_price_per_animal: form.maxPrice ? Number(form.maxPrice) : null,
      location: form.location,
      required_by: form.requiredBy || null,
      notes: form.notes || null,
    })
    setLoadingId("")
    setMessage(
      error
        ? error.message
        : "Bulk request published. Registered owners can now send offers.",
    )
    if (!error) {
      setForm({
        species: "cattle",
        breed: "",
        quantity: "10",
        sexPreference: "any",
        maxPrice: "",
        location: "",
        requiredBy: "",
        notes: "",
      })
      await load()
    }
  }

  const toggleAnimal = (requestId: string, animalId: string) => {
    setSelections((current) => {
      const selected = current[requestId] ?? []
      return {
        ...current,
        [requestId]: selected.includes(animalId)
          ? selected.filter((id) => id !== animalId)
          : [...selected, animalId],
      }
    })
  }

  const submitOffer = async (request: PurchaseRequest) => {
    const selected = selections[request.id] ?? []
    if (!selected.length) {
      setMessage("Select at least one matching animal for your offer.")
      return
    }
    setLoadingId(request.id)
    setMessage("")
    const { error } = await supabase.rpc("submit_bulk_offer", {
      request_id_input: request.id,
      animal_ids_input: selected,
      total_price_input: Number(offerPrices[request.id]),
      message_input: offerMessages[request.id] || null,
    })
    setLoadingId("")
    setMessage(
      error
        ? error.message
        : `Offer sent with ${selected.length} registered animals.`,
    )
    if (!error) {
      setSelections((current) => ({ ...current, [request.id]: [] }))
      setOfferPrices((current) => ({ ...current, [request.id]: "" }))
      setOfferMessages((current) => ({ ...current, [request.id]: "" }))
      await load()
    }
  }

  const acceptOffer = async (offerId: string) => {
    setLoadingId(offerId)
    const { error } = await supabase.rpc("accept_bulk_offer", {
      offer_id_input: offerId,
    })
    setLoadingId("")
    setMessage(
      error
        ? error.message
        : "Offer accepted. Inspect the animals and arrange payment and handover.",
    )
    if (!error) await load()
  }

  const completeOffer = async (offerId: string) => {
    setLoadingId(offerId)
    const { error } = await supabase.rpc("complete_bulk_purchase", {
      offer_id_input: offerId,
    })
    setLoadingId("")
    setMessage(
      error
        ? error.message
        : "Bulk purchase completed. Every animal was transferred individually.",
    )
    if (!error) await load()
  }

  const ownOfferRequestIds = useMemo(
    () => new Set(offers.map((offer) => offer.request_id)),
    [offers],
  )

  if (!isBuyer && !isOwner) {
    return (
      <div className="grid gap-8">
        <PageTitle
          eyebrow="Bulk marketplace"
          title="Bulk livestock orders"
          description="Bulk purchase requests are available to buyer and livestock-owner accounts."
        />
      </div>
    )
  }

  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Bulk marketplace"
        title={isBuyer ? "Source livestock in bulk" : "Bulk buying opportunities"}
        description={
          isBuyer
            ? "Publish one request, compare offers from registered owners, and transfer every selected animal in one confirmation."
            : "Respond to buyer demand using active livestock already registered to your HerdLedger account."
        }
      />

      <div className="rounded-2xl border border-brand/20 bg-brand-soft p-5">
        <div className="flex gap-3">
          <Boxes className="mt-0.5 size-5 shrink-0 text-brand" />
          <p className="text-sm leading-6 text-brand">
            A bulk order groups the agreement, but each animal keeps its unique
            LVT-NG tag, QR code, theft status, ownership transfer, and ledger
            history. Payment remains directly between buyer and owner.
          </p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          {message}
        </div>
      )}

      {isBuyer && (
        <form
          onSubmit={createRequest}
          className="grid gap-5 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div className="sm:col-span-2 xl:col-span-4">
            <p className="font-display text-xl font-semibold">
              Create a purchase request
            </p>
            <p className="mt-1 text-sm text-muted">
              Owners can offer all or part of your requested quantity.
            </p>
          </div>
          <SelectField
            label="Species"
            value={form.species}
            onChange={(event) =>
              setForm({ ...form, species: event.target.value })
            }
          >
            <option value="cattle">Cattle</option>
            <option value="goat">Goats</option>
            <option value="sheep">Sheep</option>
          </SelectField>
          <Field
            label="Preferred breed (optional)"
            value={form.breed}
            onChange={(event) => setForm({ ...form, breed: event.target.value })}
          />
          <Field
            label="Quantity"
            type="number"
            min="2"
            max="500"
            value={form.quantity}
            onChange={(event) =>
              setForm({ ...form, quantity: event.target.value })
            }
            required
          />
          <SelectField
            label="Sex preference"
            value={form.sexPreference}
            onChange={(event) =>
              setForm({ ...form, sexPreference: event.target.value })
            }
          >
            <option value="any">Any</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </SelectField>
          <Field
            label="Maximum per animal (₦)"
            type="number"
            min="1"
            value={form.maxPrice}
            onChange={(event) =>
              setForm({ ...form, maxPrice: event.target.value })
            }
          />
          <Field
            label="Delivery or collection location"
            value={form.location}
            onChange={(event) =>
              setForm({ ...form, location: event.target.value })
            }
            required
          />
          <Field
            label="Required by (optional)"
            type="date"
            value={form.requiredBy}
            onChange={(event) =>
              setForm({ ...form, requiredBy: event.target.value })
            }
          />
          <div className="sm:col-span-2 xl:col-span-4">
            <TextareaField
              label="Additional requirements"
              placeholder="Health, breed, age, inspection, or delivery requirements"
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <Button type="submit" loading={loadingId === "create"}>
              <Send className="size-4" /> Publish bulk request
            </Button>
          </div>
        </form>
      )}

      <section className="grid gap-5">
        <div>
          <p className="font-display text-2xl font-semibold">
            {isBuyer ? "My purchase requests" : "Open buyer requests"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {isBuyer
              ? "Track offered, accepted, and completed quantities."
              : "Select matching animals from your registered herd."}
          </p>
        </div>

        {requests.length ? (
          requests.map((request) => {
            const requestOffers = offers.filter(
              (offer) => offer.request_id === request.id,
            )
            const acceptedCount = requestOffers
              .filter((offer) =>
                ["accepted", "completed"].includes(offer.status),
              )
              .reduce((sum, offer) => sum + Number(offer.animal_count), 0)
            const matchingAnimals = animals.filter(
              (animal) =>
                animal.species === request.species &&
                (request.sex_preference === "any" ||
                  animal.sex === request.sex_preference),
            )
            const selected = selections[request.id] ?? []
            const alreadyOffered =
              isOwner && ownOfferRequestIds.has(request.id)

            return (
              <article
                key={request.id}
                className="overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-display text-2xl font-semibold capitalize">
                        {request.quantity} {request.species}
                      </p>
                      <Badge tone={statusTone(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {request.breed || "Any breed"} ·{" "}
                      {request.sex_preference === "any"
                        ? "Any sex"
                        : request.sex_preference}
                    </p>
                    <p className="mt-2 font-mono text-xs font-semibold text-brand">
                      {request.request_ref}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                      <span className="flex items-center gap-2">
                        <MapPin className="size-4" /> {request.location}
                      </span>
                      {request.required_by && (
                        <span className="flex items-center gap-2">
                          <CalendarDays className="size-4" /> Needed by{" "}
                          {new Date(
                            `${request.required_by}T00:00:00`,
                          ).toLocaleDateString()}
                        </span>
                      )}
                      {request.max_price_per_animal && (
                        <span>
                          Up to {formatNaira(request.max_price_per_animal)} each
                        </span>
                      )}
                    </div>
                    {request.notes && (
                      <p className="mt-4 text-sm leading-6 text-muted">
                        {request.notes}
                      </p>
                    )}
                  </div>
                  {isBuyer && (
                    <div className="min-w-40 rounded-2xl bg-canvas p-4 text-center">
                      <p className="font-display text-3xl font-semibold text-brand">
                        {acceptedCount}/{request.quantity}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        animals secured
                      </p>
                    </div>
                  )}
                </div>

                {isOwner && (
                  <div className="border-t border-line bg-canvas/60 p-6">
                    {alreadyOffered ? (
                      <div className="flex items-center gap-3 text-sm text-success">
                        <Check className="size-5" />
                        You have submitted an offer for this request.
                      </div>
                    ) : matchingAnimals.length ? (
                      <div className="grid gap-5">
                        <div>
                          <p className="text-sm font-semibold">
                            Select livestock to include
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {matchingAnimals.map((animal) => {
                              const active = selected.includes(animal.id)
                              return (
                                <Button
                                  key={animal.id}
                                  type="button"
                                  variant={active ? "primary" : "secondary"}
                                  onClick={() =>
                                    toggleAnimal(request.id, animal.id)
                                  }
                                  aria-pressed={active}
                                  className="min-h-9 px-3 py-2"
                                >
                                  <PawPrint className="size-4" />
                                  {animal.name || animal.species} ·{" "}
                                  {animal.tag_id}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field
                            label="Total offer price (₦)"
                            type="number"
                            min="1"
                            value={offerPrices[request.id] ?? ""}
                            onChange={(event) =>
                              setOfferPrices((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            required
                          />
                          <Field
                            label="Offer note"
                            placeholder="Inspection or handover details"
                            value={offerMessages[request.id] ?? ""}
                            onChange={(event) =>
                              setOfferMessages((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Button
                            onClick={() => submitOffer(request)}
                            loading={loadingId === request.id}
                            disabled={
                              !selected.length || !offerPrices[request.id]
                            }
                          >
                            Submit offer for {selected.length} animal
                            {selected.length === 1 ? "" : "s"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">
                        You do not currently own active livestock matching this
                        request.
                      </p>
                    )}
                  </div>
                )}

                {isBuyer && requestOffers.length > 0 && (
                  <div className="border-t border-line">
                    <div className="border-b border-line bg-canvas/60 px-6 py-3">
                      <p className="text-sm font-semibold">Owner offers</p>
                    </div>
                    <div className="divide-y divide-line">
                      {requestOffers.map((offer) => {
                        const whatsappUrl = offer.owner_phone
                          ? `https://wa.me/${offer.owner_phone
                              .replace(/\D/g, "")
                              .replace(
                                /^0/,
                                "234",
                              )}?text=${encodeURIComponent(
                              `Hello ${offer.owner_name}, I am reviewing your HerdLedger bulk offer ${offer.order_ref}.`,
                            )}`
                          : ""
                        return (
                          <div
                            key={offer.id}
                            className="grid gap-4 p-6 lg:grid-cols-[1fr_auto] lg:items-center"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="font-semibold">
                                  {offer.owner_name}
                                </p>
                                <Badge tone={statusTone(offer.status)}>
                                  {offer.status}
                                </Badge>
                              </div>
                              <p className="mt-1 font-mono text-xs text-brand">
                                {offer.order_ref}
                              </p>
                              <p className="mt-3 text-sm text-muted">
                                {offer.animal_count} animals ·{" "}
                                {formatNaira(offer.total_price)} total ·{" "}
                                {formatNaira(
                                  offer.total_price / offer.animal_count,
                                )}{" "}
                                average
                              </p>
                              {offer.message && (
                                <p className="mt-2 text-sm text-muted">
                                  {offer.message}
                                </p>
                              )}
                              <div className="mt-4 flex flex-wrap gap-2">
                                {offer.animals.map((animal) => (
                                  <Link
                                    key={animal.id}
                                    to={`/verify?tag=${animal.tag_id}`}
                                    className="inline-flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-semibold text-brand transition hover:border-brand"
                                  >
                                    <PawPrint className="size-3.5" />
                                    {animal.name || animal.species} ·{" "}
                                    {animal.tag_id}
                                  </Link>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {whatsappUrl && (
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    window.open(
                                      whatsappUrl,
                                      "_blank",
                                      "noopener,noreferrer",
                                    )
                                  }
                                >
                                  <MessageCircle className="size-4" /> WhatsApp
                                </Button>
                              )}
                              {offer.status === "submitted" && (
                                <Button
                                  onClick={() => acceptOffer(offer.id)}
                                  loading={loadingId === offer.id}
                                >
                                  <Users className="size-4" /> Accept offer
                                </Button>
                              )}
                              {offer.status === "accepted" && (
                                <Button
                                  onClick={() => completeOffer(offer.id)}
                                  loading={loadingId === offer.id}
                                >
                                  <PackageCheck className="size-4" /> Confirm
                                  handover & transfer all
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </article>
            )
          })
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
            <ClipboardList className="size-10 text-muted/40" />
            <p className="mt-4 font-display text-xl font-semibold">
              {isBuyer ? "No bulk requests yet" : "No open buyer requests"}
            </p>
            <p className="mt-2 text-sm text-muted">
              {isBuyer
                ? "Create your first request using the form above."
                : "New matching opportunities will appear here."}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
