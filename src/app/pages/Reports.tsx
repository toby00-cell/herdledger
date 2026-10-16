import {
  CheckCircle2,
  CircleAlert,
  MapPinCheck,
  ShieldAlert,
} from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"
import {
  Badge,
  Button,
  PageTitle,
  SelectField,
  TextareaField,
} from "../components/ui"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../lib/supabase"

type Animal = {
  id: string
  tag_id: string
  name: string | null
  species: string
  status: string
}
type TheftReport = {
  id: string
  animal_id: string
  details: string
  is_active: boolean
  found_at: string | null
  found_details: string | null
}
export default function Reports() {
  const { user, profile } = useAuth()
  const [animals, setAnimals] = useState<Animal[]>([])
  const [animalId, setAnimalId] = useState("")
  const [details, setDetails] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<TheftReport[]>([])
  const load = async () => {
    if (!user) return
    const [{ data }, { data: reportData }] = await Promise.all([
      supabase
        .from("animals")
        .select("id, tag_id, name, species, status")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("theft_reports")
        .select("id, animal_id, details, is_active, found_at, found_details")
        .eq("reporter_id", user.id)
        .eq("is_active", true),
    ])
    setAnimals(data ?? [])
    setReports(reportData ?? [])
    if (!animalId && data?.length) setAnimalId(data[0].id)
  }
  useEffect(() => {
    void load()
  }, [user])
  const report = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setLoading(true)
    const { error } = await supabase
      .from("theft_reports")
      .insert({ animal_id: animalId, reporter_id: user.id, details })
    setLoading(false)
    setMessage(
      error
        ? error.message
        : "The theft alert is now active on public verification.",
    )
    if (!error) {
      setDetails("")
      await load()
    }
  }
  const reclaim = async (reportId: string) => {
    setLoading(true)
    const { error } = await supabase.rpc("reclaim_stolen_animal", {
      report_id_input: reportId,
    })
    setLoading(false)
    setMessage(
      error
        ? error.message
        : "Animal reclaimed. The theft alert has been closed.",
    )
    if (!error) await load()
  }
  if (profile?.role === "official" || profile?.role === "admin") {
    return <OfficialReports />
  }
  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Safety"
        title="Theft reports"
        description="Flag a missing animal immediately. Active alerts are shown to anyone who verifies its tag."
      />
      <div className="rounded-2xl border border-warning/20 bg-warning-soft p-5">
        <div className="flex gap-3">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
          <p className="text-sm leading-6 text-warning">
            Submit only genuine reports. Contact local security authorities as
            well—this registry does not replace a police report.
          </p>
        </div>
      </div>
      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <form
          onSubmit={report}
          className="h-fit rounded-2xl border border-line bg-surface p-6"
        >
          <h2 className="font-display text-xl font-semibold">
            Report missing livestock
          </h2>
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
              {animals
                .filter((a) => a.status !== "stolen")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.species} · {a.tag_id}
                  </option>
                ))}
            </SelectField>
            <TextareaField
              label="Last seen details"
              placeholder="Where and when was the animal last seen?"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
            />
            <Button
              variant="danger"
              type="submit"
              loading={loading}
              disabled={!animalId}
            >
              Activate theft alert
            </Button>
          </div>
        </form>
        <div className="rounded-2xl border border-line bg-surface">
          <div className="border-b border-line p-6">
            <h2 className="font-display text-xl font-semibold">
              Animal status
            </h2>
            <p className="mt-1 text-sm text-muted">
              Current alerts in your herd
            </p>
          </div>
          {animals.length ? (
            <div className="divide-y divide-line">
              {animals.map((a) => {
                const theftReport = reports.find(
                  (reportItem) => reportItem.animal_id === a.id,
                )
                return (
                  <div
                    key={a.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-canvas text-muted">
                      <ShieldAlert className="size-5" />
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold">{a.name || a.species}</p>
                      <p className="mt-1 text-xs font-mono text-muted">
                        {a.tag_id}
                      </p>
                      {theftReport?.found_at && (
                        <p className="mt-2 text-xs font-medium text-success">
                          Found by a market official
                          {theftReport.found_details
                            ? ` · ${theftReport.found_details}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <Badge tone={a.status === "stolen" ? "danger" : "success"}>
                      {theftReport?.found_at ? "found" : a.status}
                    </Badge>
                    {theftReport?.found_at && (
                      <Button
                        onClick={() => reclaim(theftReport.id)}
                        loading={loading}
                      >
                        <CheckCircle2 className="size-4" /> Reclaim animal
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-muted">
              Register an animal to manage theft alerts.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function OfficialReports() {
  const [reports, setReports] = useState<{
    id: string
    details: string
    reported_at: string
    animal_id: string
    is_active: boolean
    found_at: string | null
    found_details: string | null
  }[]>([])
  const [foundDetails, setFoundDetails] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")

  const loadReports = async () => {
    const { data } = await supabase
      .from("theft_reports")
      .select(
        "id, details, reported_at, animal_id, is_active, found_at, found_details",
      )
      .eq("is_active", true)
      .order("reported_at", { ascending: false })
    setReports(data ?? [])
  }
  useEffect(() => {
    void loadReports()
  }, [])
  const markFound = async (reportId: string) => {
    const details = foundDetails[reportId]?.trim()
    if (!details) {
      setMessage("Add where the animal was found before notifying its owner.")
      return
    }
    const { error } = await supabase.rpc("mark_stolen_animal_found", {
      report_id_input: reportId,
      details_input: details,
    })
    setMessage(
      error
        ? error.message
        : "Owner notified. The alert stays active until the owner reclaims the animal.",
    )
    if (!error) await loadReports()
  }

  return (
    <div className="grid gap-8">
      <PageTitle
        eyebrow="Market safety"
        title="Active theft alerts"
        description="Use these warnings when inspecting livestock presented for sale at the market."
      />
      <div className="rounded-2xl border border-warning/20 bg-warning-soft p-5">
        <div className="flex gap-3">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
          <p className="text-sm leading-6 text-warning">
            Compare the animal’s tag and physical markings, then contact the
            reporting owner and relevant security authority before taking
            action.
          </p>
        </div>
      </div>
      {message && (
        <div className="rounded-xl bg-surface p-3 text-sm text-muted">
          {message}
        </div>
      )}
      <section className="rounded-2xl border border-line bg-surface">
        {reports.length ? (
          <div className="divide-y divide-line">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
                  <ShieldAlert className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{report.details}</p>
                  <p className="mt-1 text-xs text-muted">
                    Animal {report.animal_id.slice(0, 8)} · Reported{" "}
                    {new Date(report.reported_at).toLocaleDateString()}
                  </p>
                </div>
                {report.found_at ? (
                  <div className="grid gap-2 sm:justify-items-end">
                    <Badge tone="success">Owner notified</Badge>
                    <p className="max-w-xs text-xs text-muted">
                      {report.found_details}
                    </p>
                  </div>
                ) : (
                  <div className="grid w-full gap-3 sm:max-w-sm">
                    <TextareaField
                      label="Where was it found?"
                      placeholder="Market, town, holding area, or contact point"
                      value={foundDetails[report.id] ?? ""}
                      onChange={(event) =>
                        setFoundDetails((current) => ({
                          ...current,
                          [report.id]: event.target.value,
                        }))
                      }
                    />
                    <Button onClick={() => markFound(report.id)}>
                      <MapPinCheck className="size-4" /> Mark found & notify
                      owner
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid place-items-center px-6 py-16 text-center">
            <ShieldAlert className="size-10 text-success" />
            <p className="mt-4 font-semibold">No active theft reports</p>
            <p className="mt-2 text-sm text-muted">
              New owner reports will appear here automatically.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
