import { Html5Qrcode } from "html5-qrcode"
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  Fingerprint,
  ImageUp,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react"
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import Brand from "../components/Brand"
import { Badge, Button, Field } from "../components/ui"
import { supabase } from "../lib/supabase"

type Animal = {
  id: string
  tag_id: string
  name: string | null
  species: string
  breed: string | null
  sex: string
  status: string
  created_at: string
}

// A QR code can hold either the full verify link or just the tag ID.
// This returns the tag ID in both cases.
const extractTag = (raw: string) => {
  const text = raw.trim()
  try {
    const url = new URL(text)
    const fromUrl = url.searchParams.get("tag")
    if (fromUrl) return fromUrl.trim().toUpperCase()
  } catch {
    // not a URL, fall through
  }
  return text.toUpperCase()
}

const SCANNER_ID = "qr-reader"

export default function Verify() {
  const [params, setParams] = useSearchParams()
  const [tag, setTag] = useState(params.get("tag") ?? "")
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState("")

  // Direct table lookup. The "Animals publicly verifiable" RLS policy
  // allows anonymous reads, so QR scans work without signing in.
  const verify = async (value: string) => {
    if (!value.trim()) return
    setLoading(true)
    setError("")
    const normalized = extractTag(value)
    const { data, error: queryError } = await supabase
      .from("animals")
      .select("id, tag_id, name, species, breed, sex, status, created_at")
      .eq("tag_id", normalized)
      .maybeSingle()
    if (queryError) {
      setAnimal(null)
      setError("Could not check the registry right now. Please try again.")
    } else {
      setAnimal(data)
    }
    setTag(normalized)
    setSearched(true)
    setLoading(false)
    setParams({ tag: normalized })
  }

  // Runs when someone opens a scanned link like /verify?tag=LVT-NG-XXXX
  useEffect(() => {
    const initial = params.get("tag")
    if (initial) void verify(initial)
  }, [])

  // Live camera scanning
  useEffect(() => {
    if (!scanning) return
    const scanner = new Html5Qrcode(SCANNER_ID)
    let started = false
    let cancelled = false

    const stop = () =>
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          setScanning(false)
          void verify(decodedText)
        },
        () => {},
      )
      .then(() => {
        started = true
        if (cancelled) void stop()
      })
      .catch(() => {
        setScanError(
          "Could not open the camera. Allow camera access, or upload a photo of the QR code instead.",
        )
        setScanning(false)
      })

    return () => {
      cancelled = true
      if (started) void stop()
    }
  }, [scanning])

  // Upload a photo of a QR code (useful on desktop or if the camera is blocked)
  const scanImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setScanError("")
    const scanner = new Html5Qrcode("qr-file-reader")
    try {
      const decodedText = await scanner.scanFile(file, false)
      void verify(decodedText)
    } catch {
      setScanError("No QR code found in that image. Try a clearer photo.")
    } finally {
      scanner.clear()
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void verify(tag)
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Brand />
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" /> Back home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Fingerprint className="size-6" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-brand">
            Public verification
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Check before ownership changes hands.
          </h1>
          <p className="mt-4 leading-7 text-muted">
            Scan the QR tag on an animal, or enter the ID printed below it, to
            confirm its registry status.
          </p>
        </div>

        <div className="mx-auto mt-9 max-w-2xl rounded-2xl border border-line bg-surface p-3 shadow-lg">
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Field
                label="HerdLedger tag ID"
                placeholder="LVT-NG-XXXXXXXX"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              loading={loading}
              className="self-end sm:min-h-12"
            >
              <Search className="size-4" /> Verify tag
            </Button>
          </form>

          <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setScanError("")
                setScanning(!scanning)
              }}
            >
              {scanning ? (
                <>
                  <X className="size-4" /> Stop scanning
                </>
              ) : (
                <>
                  <Camera className="size-4" /> Scan QR code
                </>
              )}
            </Button>
            <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line px-5 text-sm font-semibold">
              <ImageUp className="size-4" /> Upload QR image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={scanImage}
              />
            </label>
          </div>

          {scanning && (
            <div className="mt-3 overflow-hidden rounded-xl bg-ink">
              <div id={SCANNER_ID} className="w-full" />
            </div>
          )}
          <div id="qr-file-reader" className="hidden" />
        </div>

        {scanError && (
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-danger/20 bg-danger-soft p-3 text-center text-sm text-danger">
            {scanError}
          </div>
        )}
        {error && (
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-danger/20 bg-danger-soft p-3 text-center text-sm text-danger">
            {error}
          </div>
        )}
        {searched && animal && (
          <section
            className={`mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border bg-surface ${
              animal.status === "stolen"
                ? "border-danger/30"
                : "border-success/30"
            }`}
          >
            <div
              className={`flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between ${
                animal.status === "stolen"
                  ? "bg-danger-soft"
                  : "bg-success-soft"
              }`}
            >
              <div className="flex items-center gap-3">
                {animal.status === "stolen" ? (
                  <ShieldAlert className="size-7 text-danger" />
                ) : (
                  <CheckCircle2 className="size-7 text-success" />
                )}
                <div>
                  <p
                    className={`font-display text-xl font-semibold ${
                      animal.status === "stolen"
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {animal.status === "stolen"
                      ? "Theft alert active"
                      : "Registry record verified"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Checked against the live HerdLedger registry
                  </p>
                </div>
              </div>
              <Badge tone={animal.status === "stolen" ? "danger" : "success"}>
                {animal.status}
              </Badge>
            </div>
            <div className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Animal identity
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold">
                  {animal.name || animal.species}
                </h2>
                <p className="mt-2 font-mono text-sm font-semibold text-brand">
                  {animal.tag_id}
                </p>
                <dl className="mt-6 grid grid-cols-2 gap-5 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Species</dt>
                    <dd className="mt-1 font-semibold capitalize">
                      {animal.species}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Breed</dt>
                    <dd className="mt-1 font-semibold">
                      {animal.breed || "Not stated"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Sex</dt>
                    <dd className="mt-1 font-semibold capitalize">
                      {animal.sex}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Registered</dt>
                    <dd className="mt-1 font-semibold">
                      {new Date(animal.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-2xl bg-canvas p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Trust checks
                </p>
                <div className="mt-5 grid gap-4">
                  <p className="flex items-center gap-3 text-sm">
                    <UserRound className="size-4 text-brand" /> Current owner on
                    record
                  </p>
                  <p className="flex items-center gap-3 text-sm">
                    <Clock3 className="size-4 text-brand" /> Ownership history
                    available
                  </p>
                  <p className="flex items-center gap-3 text-sm">
                    <Fingerprint className="size-4 text-brand" /> Ledger
                    integrity monitored
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
        {searched && !animal && !error && (
          <section className="mx-auto mt-8 max-w-2xl rounded-2xl border border-line bg-surface p-10 text-center">
            <Search className="mx-auto size-9 text-muted/40" />
            <h2 className="mt-4 font-display text-xl font-semibold">
              No matching record
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Check the tag for typing errors. A missing record is not proof of
              ownership.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}