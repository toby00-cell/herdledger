import { ArrowLeft, CheckCircle2, QrCode } from "lucide-react"
import { type FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router"
import {
  Button,
  Field,
  PageTitle,
  SelectField,
  TextareaField,
} from "../components/ui"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

// Today's date as YYYY-MM-DD in the user's local time zone (not UTC)
const todayString = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

export default function RegisterAnimal() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: "",
    species: "cattle",
    breed: "",
    sex: "female",
    birthDate: "",
    colorMarkings: "",
    location: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const today = todayString()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setError("")
    if (form.birthDate && form.birthDate > today) {
      return setError("Date of birth cannot be in the future.")
    }
    setLoading(true)
    const { error: insertError } = await supabase.from("animals").insert({
      owner_id: user.id,
      name: form.name || null,
      species: form.species,
      breed: form.breed || null,
      sex: form.sex,
      birth_date: form.birthDate || null,
      color_markings: form.colorMarkings,
      registration_location: form.location,
    })
    setLoading(false)
    if (insertError) return setError(insertError.message)
    navigate("/animals")
  }
  return (
    <div className="grid gap-8">
      <Link
        to="/animals"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to livestock
      </Link>
      <PageTitle
        eyebrow="New identity"
        title="Register an animal"
        description="Create a permanent digital record. Use details that can help another person identify the animal."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.45fr]">
        <form
          onSubmit={submit}
          className="grid gap-6 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-2 sm:p-8"
        >
          {error && (
            <div className="rounded-xl bg-danger-soft p-3 text-sm text-danger sm:col-span-2">
              {error}
            </div>
          )}
          <Field
            label="Animal name (optional)"
            placeholder="e.g. Zuma"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <SelectField
            label="Species"
            value={form.species}
            onChange={(e) => setForm({ ...form, species: e.target.value })}
          >
            <option value="cattle">Cattle</option>
            <option value="goat">Goat</option>
            <option value="sheep">Sheep</option>
          </SelectField>
          <Field
            label="Breed"
            placeholder="e.g. White Fulani"
            value={form.breed}
            onChange={(e) => setForm({ ...form, breed: e.target.value })}
          />
          <SelectField
            label="Sex"
            value={form.sex}
            onChange={(e) => setForm({ ...form, sex: e.target.value })}
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </SelectField>
          <Field
            label="Date of birth / estimate"
            type="date"
            max={today}
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            hint="Cannot be a future date."
          />
          <Field
            label="Registration location"
            placeholder="Town, market, or LGA"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
          />
          <div className="sm:col-span-2">
            <TextareaField
              label="Colour and identifying markings"
              placeholder="Describe coat colour, horn shape, scars, brands, or visible features."
              value={form.colorMarkings}
              onChange={(e) =>
                setForm({ ...form, colorMarkings: e.target.value })
              }
              required
            />
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
            <Link
              to="/animals"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold"
            >
              Cancel
            </Link>
            <Button type="submit" loading={loading}>
              Create identity record
            </Button>
          </div>
        </form>
        <aside className="h-fit rounded-2xl bg-brand p-6 text-white">
          <QrCode className="size-10 text-accent" />
          <h2 className="mt-6 font-display text-2xl font-semibold">
            What happens next?
          </h2>
          <div className="mt-6 grid gap-4">
            {[
              "A unique LVT-NG tag number is generated.",
              "The first hash-chained ledger entry is sealed.",
              "A QR code becomes available for the animal.",
            ].map((item) => (
              <p
                key={item}
                className="flex gap-3 text-sm leading-6 text-white/70"
              >
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-accent" />{" "}
                {item}
              </p>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}