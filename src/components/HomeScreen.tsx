import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { documentMeta } from '../data/document'
import type { DocumentInput } from '../types/document'
import { fileToBase64 } from '../utils/image'
import { PositioningPanel, Roadmap } from './ui'

interface Props {
  onStart: (documentInput: DocumentInput) => void
  onOpenSample: () => void
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const ScanIcon = () => (
  <svg viewBox="0 0 48 48" className="h-14 w-14" aria-hidden="true">
    <path d="M6 16V9a3 3 0 0 1 3-3h7M42 16V9a3 3 0 0 0-3-3h-7M6 32v7a3 3 0 0 0 3 3h7M42 32v7a3 3 0 0 1-3 3h-7" {...stroke} />
    <path d="M14 24h20" {...stroke} />
    <path d="M17 17h14M17 31h14" {...stroke} strokeOpacity="0.45" />
  </svg>
)

const UploadIcon = () => (
  <svg viewBox="0 0 48 48" className="h-14 w-14" aria-hidden="true">
    <path d="M24 32V8m0 0-9 9m9-9 9 9" {...stroke} />
    <path d="M7 30v8a4 4 0 0 0 4 4h26a4 4 0 0 0 4-4v-8" {...stroke} />
  </svg>
)

const PasteIcon = () => (
  <svg viewBox="0 0 48 48" className="h-14 w-14" aria-hidden="true">
    <path d="M21 27a8 8 0 0 0 11.3 0l6.4-6.4A8 8 0 0 0 27.4 9.3L24 12.7" {...stroke} />
    <path d="M27 21a8 8 0 0 0-11.3 0L9.3 27.4a8 8 0 0 0 11.3 11.3L24 35.3" {...stroke} />
  </svg>
)

function Card({
  icon,
  label,
  note,
  onClick,
}: {
  icon: ReactNode
  label: string
  note: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[220px] flex-col items-start gap-5 border-2 border-[var(--ink)] bg-transparent p-7 text-left transition-colors duration-150 hover:bg-[var(--ink)] hover:text-[var(--paper)]"
    >
      <span className="text-[var(--teal)] transition-colors duration-150 group-hover:text-[var(--paper)]">
        {icon}
      </span>
      <span className="mt-auto">
        <span className="block text-[24px] leading-tight font-semibold">{label}</span>
        <span className="mt-1.5 block max-w-[28ch] text-[17px] leading-snug text-[var(--ink-soft)] transition-colors duration-150 group-hover:text-[#D9D6CD]">
          {note}
        </span>
      </span>
    </button>
  )
}

export default function HomeScreen({ onStart, onOpenSample }: Props) {
  const scanInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleFile(file?: File) {
    setLocalError(null)

    if (!file || !file.type.startsWith('image/')) {
      setLocalError('Please choose an image file.')
      return
    }

    try {
      const { data, mediaType } = await fileToBase64(file)
      onStart({ type: 'image', data, mediaType })
    } catch {
      setLocalError("We couldn't read that image. Please try another one.")
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    await handleFile(input.files?.[0])
    input.value = ''
  }

  function handlePasteContinue() {
    setLocalError(null)
    const text = pastedText.trim()
    if (!text) {
      setLocalError('Please paste some text first.')
      return
    }

    onStart({ type: 'text', text })
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-6 pt-16 pb-24 md:px-10">
      <p className="text-[17px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">
        Access Reader
      </p>
      <h1 className="mt-4 max-w-[16ch] text-[clamp(38px,6vw,64px)] leading-[1.08] font-semibold">
        What would you like translated?
      </h1>
      <p className="mt-6 max-w-[62ch] text-[20px] text-[var(--ink-soft)]">
        Access Reader turns a written document into New Zealand Sign Language, with
        plain-language subtitles and the original text kept beside it.
      </p>

      <h2 className="sr-only">Choose how to add your document</h2>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        <Card
          icon={<ScanIcon />}
          label="Scan a document"
          note="Use your camera to photograph a letter or form."
          onClick={() => {
            setLocalError(null)
            scanInputRef.current?.click()
          }}
        />
        <Card
          icon={<UploadIcon />}
          label="Upload a file"
          note="A photo you already have on this device."
          onClick={() => {
            setLocalError(null)
            uploadInputRef.current?.click()
          }}
        />
        <Card
          icon={<PasteIcon />}
          label="Paste a link or text"
          note="A web page address, or text copied from anywhere."
          onClick={() => {
            setLocalError(null)
            setPasteOpen(true)
          }}
        />
      </div>

      <input
        ref={scanInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      {pasteOpen && (
        <div className="mt-6 max-w-[720px] border-2 border-[var(--ink)] p-6">
          <label htmlFor="document-text" className="block text-[20px] font-semibold">
            Paste text
          </label>
          <textarea
            id="document-text"
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            rows={7}
            className="mt-3 w-full resize-y border-2 border-[var(--rule)] bg-[var(--paper)] p-4 text-[18px] text-[var(--ink)]"
            placeholder="Paste the document text here"
          />
          <button
            type="button"
            onClick={handlePasteContinue}
            className="mt-4 border-2 border-[var(--teal)] bg-[var(--teal)] px-6 py-3 font-semibold text-[var(--paper)] transition-colors hover:bg-[var(--teal-deep)]"
          >
            Continue
          </button>
        </div>
      )}

      {localError && (
        <p role="alert" className="mt-4 max-w-[62ch] font-semibold text-red-700">
          {localError}
        </p>
      )}

      <p className="mt-8 max-w-[62ch] text-[18px]">
        Your document stays private. Nothing is shared.
      </p>

      {/* Said up front, not at the bottom of the page. */}
      <div className="mt-14">
        <PositioningPanel />
      </div>

      <section className="mt-16 border-t-2 border-[var(--rule)] pt-8">
        <h2 className="text-[22px] font-semibold">Continue where you left off</h2>
        <button
          type="button"
          onClick={onOpenSample}
          className="mt-5 flex w-full max-w-[640px] items-center justify-between gap-6 border-2 border-[var(--rule)] p-6 text-left transition-colors duration-150 hover:border-[var(--ink)]"
        >
          <span>
            <span className="block text-[20px] font-semibold">{documentMeta.title}</span>
            <span className="mt-1 block text-[17px] text-[var(--ink-soft)]">
              {documentMeta.source} · {documentMeta.received} · {documentMeta.pages} pages
            </span>
          </span>
          <span className="shrink-0 text-[18px] font-semibold text-[var(--teal)] underline decoration-2 underline-offset-4">
            Open
          </span>
        </button>
      </section>

      <div className="mt-16 max-w-[68ch]">
        <Roadmap />
      </div>
    </main>
  )
}
