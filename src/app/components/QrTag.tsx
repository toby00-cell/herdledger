import { Download } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import { useRef } from "react"
import { Button } from "./ui"

// Build the public verification link that the QR code points to.
// Scanning it with any phone camera opens /verify with the tag filled in.
export const verifyUrl = (tagId: string) =>
  `${window.location.origin}/verify?tag=${encodeURIComponent(tagId)}`

export default function QrTag({
  tagId,
  size = 200,
}: {
  tagId: string
  size?: number
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const download = () => {
    const canvas = wrapperRef.current?.querySelector("canvas")
    if (!canvas) return
    const link = document.createElement("a")
    link.href = canvas.toDataURL("image/png")
    link.download = `${tagId}.png`
    link.click()
  }

  return (
    <div className="inline-block rounded-2xl border border-line bg-white p-5 text-center">
      <div ref={wrapperRef} className="inline-block">
        <QRCodeCanvas
          value={verifyUrl(tagId)}
          size={size}
          level="M"
          marginSize={2}
        />
      </div>
      <p className="mt-3 font-mono text-xs font-semibold text-brand">{tagId}</p>
      <Button variant="secondary" className="mt-4 w-full" onClick={download}>
        <Download className="size-4" /> Download QR
      </Button>
    </div>
  )
}