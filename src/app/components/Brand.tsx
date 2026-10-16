import { ScanLine } from "lucide-react"
import { Link } from "react-router"

export default function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5"
      aria-label="HerdLedger home"
    >
      <span
        className={`grid size-10 place-items-center rounded-xl ${
          inverse ? "bg-white text-brand" : "bg-brand text-white"
        }`}
      >
        <ScanLine className="size-5" />
      </span>
      <span
        className={`font-display text-xl font-semibold ${
          inverse ? "text-white" : "text-ink"
        }`}
      >
        HerdLedger
      </span>
    </Link>
  )
}
