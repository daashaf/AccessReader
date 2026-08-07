import { useEffect, useState } from 'react'
import { Button, Tick } from './ui'

const STEPS = [
  'Reading your document',
  'Finding the structure',
  'Translating to NZSL',
  'Preparing the signing',
]

interface Props {
  /** True once the real AI call has actually finished. */
  ready: boolean
  onDone: () => void
  onCancel: () => void
  title?: string
}

/**
 * Progress is entirely visual: steps appear as they complete, each with a tick
 * and a filling bar. Nothing here depends on a sound. The live region announces
 * the same information for screen-reader users.
 *
 * The step animation always plays out on its own timer so this never looks
 * broken on a fast connection — but it only calls onDone once `ready` is
 * true, so a slow document doesn't jump into a translation that isn't there yet.
 */
export default function ProcessingScreen({ ready, onDone, onCancel, title }: Props) {
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (done >= STEPS.length) {
      if (!ready) return
      const finish = setTimeout(onDone, 900)
      return () => clearTimeout(finish)
    }
    const next = setTimeout(() => setDone((n) => n + 1), done === 0 ? 700 : 1150)
    return () => clearTimeout(next)
  }, [done, ready, onDone])

  const pct = Math.round((done / STEPS.length) * 100)

  return (
    <main className="mx-auto w-full max-w-[760px] px-6 pt-20 pb-24 md:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[clamp(30px,4vw,42px)] leading-tight font-semibold">
            Preparing your translation
          </h1>
          <p className="mt-4 text-[19px] text-[var(--ink-soft)]">{title || 'Your document'}</p>
        </div>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div className="mt-10 h-4 w-full border-2 border-[var(--ink)]">
        <div
          className="h-full bg-[var(--teal)] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-[18px] font-semibold">{pct}% complete</p>

      <h2 className="sr-only">Progress steps</h2>
      <ol className="mt-10 flex flex-col gap-4">
        {STEPS.map((step, i) => {
          const complete = i < done
          const active = i === done
          if (!complete && !active) return null
          return (
            <li
              key={step}
              className={`flex items-center gap-4 border-2 p-5 ${
                complete
                  ? 'border-[var(--teal)] bg-[#E6EFEE]'
                  : 'border-[var(--rule)] bg-transparent'
              }`}
              style={{ animation: 'nzsl-rise 320ms ease-out both' }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-current text-[var(--teal)]">
                {complete ? (
                  <Tick />
                ) : (
                  <span
                    className="block h-4 w-4 bg-[var(--teal)]"
                    style={{ animation: 'nzsl-pulse 900ms ease-in-out infinite' }}
                  />
                )}
              </span>
              <span className="text-[20px] font-medium">{step}</span>
              <span className="ml-auto text-[17px] font-semibold text-[var(--ink-soft)]">
                {complete ? 'Done' : 'Working'}
              </span>
            </li>
          )
        })}
      </ol>

      {/* The cache is a deliberate decision, so it is stated rather than hidden:
          re-watching a clause five times must not cost five OCR passes. */}
      <p className="mt-8 max-w-[62ch] border-l-[6px] border-[var(--rule)] pl-4 text-[17px] text-[var(--ink-soft)]">
        Your document is read once and then saved. Replaying a section or jumping back
        will not make you wait for this again.
      </p>

      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {done >= STEPS.length
          ? 'All steps complete. Opening your translation.'
          : `Step ${done + 1} of ${STEPS.length}: ${STEPS[done]}.`}
      </p>
    </main>
  )
}
