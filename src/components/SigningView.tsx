import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SigningAvatar from './SigningAvatar'
import { Button, Tick, DisclosureStrip } from './ui'
import { formatDuration, nonManualLabel, nonManualMeaning, sectionSeconds } from '../data/document'
import type { Section } from '../data/document'
import type { Settings } from './SettingsScreen'
import type { DocumentMeta } from '../lib/api'

type TextMode = 'simplified' | 'original' | 'gloss'

const SPEEDS = [0.75, 1, 1.25] as const

const subtitlePx: Record<Settings['subtitleSize'], number> = {
  medium: 24,
  large: 30,
  'x-large': 38,
}

const stageHeight: Record<Settings['avatarSize'], string> = {
  standard: 'clamp(320px, 46vh, 520px)',
  large: 'clamp(380px, 58vh, 680px)',
}

interface Props {
  documentMeta: DocumentMeta
  sections: Section[]
  settings: Settings
  onExit: () => void
  onOpenSettings: () => void
  onSettingsChange: (settings: Settings) => void
}

export default function SigningView({ documentMeta, sections, settings, onExit, onOpenSettings, onSettingsChange }: Props) {
  const [sectionIndex, setSectionIndex] = useState(0)
  const [cueIndex, setCueIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<number>(settings.defaultSpeed)
  const [complete, setComplete] = useState(false)
  const [watched, setWatched] = useState<string[]>([])
  const [textMode, setTextMode] = useState<TextMode>('simplified')
  const nextButton = useRef<HTMLButtonElement>(null)

  const section = sections[sectionIndex]
  const cue = section.cues[cueIndex]

  // Playback clock. 120ms ticks are enough to drive subtitles and the progress
  // bar; the avatar runs its own animation frame loop.
  useEffect(() => {
    // keep local speed in sync with global settings
    setSpeed(settings.defaultSpeed)
  }, [settings.defaultSpeed])

  useEffect(() => {
    if (!playing || complete) return
    const id = setInterval(() => setElapsed((e) => e + 0.12 * speed), 120)
    return () => clearInterval(id)
  }, [playing, complete, speed])

  useEffect(() => {
    if (elapsed < cue.seconds) return
    if (cueIndex + 1 < section.cues.length) {
      setCueIndex((i) => i + 1)
      setElapsed(0)
    } else {
      setPlaying(false)
      setComplete(true)
      setWatched((w) => (w.includes(section.id) ? w : [...w, section.id]))
    }
  }, [elapsed, cue.seconds, cueIndex, section])

  useEffect(() => {
    if (complete) nextButton.current?.focus()
  }, [complete])

  const goTo = useCallback((index: number, autoplay = true) => {
    setSectionIndex(index)
    setCueIndex(0)
    setElapsed(0)
    setComplete(false)
    setPlaying(autoplay)
  }, [])

  const replay = useCallback(() => {
    setCueIndex(0)
    setElapsed(0)
    setComplete(false)
    setPlaying(true)
  }, [])

  const sectionElapsed = useMemo(
    () => section.cues.slice(0, cueIndex).reduce((t, c) => t + c.seconds, 0) + elapsed,
    [section, cueIndex, elapsed],
  )
  const total = sectionSeconds(section)
  const progress = complete ? 100 : Math.min(100, (sectionElapsed / total) * 100)
  const isLast = sectionIndex === sections.length - 1

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b-2 border-[var(--rule)] px-6 py-4 md:px-8">
        <Button variant="quiet" onClick={onExit} className="px-0">
          ← All documents
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] leading-tight font-semibold">
            {documentMeta.title}
          </h1>
          <p className="text-[16px] text-[var(--ink-soft)]">{documentMeta.source}</p>
        </div>
        <Button variant="quiet" onClick={onOpenSettings} className="ml-auto px-0">
          Settings
        </Button>
      </header>

      <div className="grid items-start gap-0 lg:grid-cols-[300px_minmax(0,1fr)_380px]">
        {/* ── Zone B: section navigator ─────────────────────────────── */}
        <nav
          aria-label="Document sections"
          className="quiet-scroll border-b-2 border-[var(--rule)] px-5 py-6 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto lg:border-r-2 lg:border-b-0 lg:px-6"
        >
          <h2 className="text-[17px] font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase">
            Jump to a section
          </h2>
          <ol className="mt-4 flex flex-col">
            {sections.map((s, i) => {
              const current = i === sectionIndex
              const seen = watched.includes(s.id)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={current ? 'true' : undefined}
                    className={`flex w-full min-h-[64px] items-start gap-3 border-l-[6px] py-3.5 pr-3 pl-4 text-left transition-colors duration-150 ${
                      current
                        ? 'border-l-[var(--teal)] bg-[#E6EFEE] font-bold'
                        : 'border-l-transparent hover:bg-[#EFEDE6]'
                    }`}
                  >
                    <span className="mt-0.5 w-[26px] shrink-0 text-[var(--teal)]">
                      {seen ? <Tick size={22} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[18px] leading-snug">{s.title}</span>
                      <span className="mt-0.5 block text-[16px] font-normal text-[var(--ink-soft)]">
                        {formatDuration(sectionSeconds(s))}
                        {current ? ' · Playing now' : seen ? ' · Watched' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <h2 className="mt-8 text-[17px] font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase">
            Coming soon
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {[
              ["What's missing?", 'Checks for unfilled fields and missing information.'],
              ['Sign to the camera', 'Sign a reply instead of typing one.'],
            ].map(([label, note]) => (
              <li key={label}>
                <div
                  aria-disabled="true"
                  className="border-2 border-dashed border-[#B6B3AA] px-4 py-3.5 text-[#6B6B6B]"
                >
                  <span className="block text-[18px] font-medium">{label}</span>
                  <span className="mt-0.5 block text-[16px] leading-snug">{note}</span>
                  <span className="mt-2 inline-block border border-[#8A8A85] px-2 py-0.5 text-[14px] font-semibold tracking-wide uppercase">
                    Coming soon
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Zone A: avatar stage ──────────────────────────────────── */}
        <main className="px-5 py-6 md:px-8">
          <h2 className="sr-only">Signing: {section.title}</h2>

          <div
            className="relative w-full overflow-hidden bg-[var(--stage)]"
            style={{ height: stageHeight[settings.avatarSize] }}
          >
            <SigningAvatar
              gloss={cue.gloss}
              nmm={cue.nmm}
              playing={playing && !complete}
              speed={speed}
              cueKey={`${section.id}-${cueIndex}`}
              dimmed={complete}
            />

            {/* Non-manual marker readout. Grammar made visible, not decoration. */}
            {cue.nmm !== 'neutral' && !complete && (
              <p className="absolute top-4 left-4 border-2 border-[#8FA3B5] px-3 py-1.5 text-[15px] font-semibold tracking-wide text-[#EDF1F5] uppercase">
                {nonManualLabel[cue.nmm]} · {nonManualMeaning[cue.nmm]}
              </p>
            )}

            {!playing && !complete && (
              <p className="absolute top-4 right-4 border-2 border-[#EDF1F5] bg-[#23292F] px-3 py-1.5 text-[16px] font-semibold text-[#EDF1F5]">
                Paused
              </p>
            )}

            {/* ── Section complete state ── */}
            {complete && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[#23292F]/92 px-6 text-center"
                style={{ animation: 'nzsl-rise 260ms ease-out both' }}
              >
                <span className="flex h-16 w-16 items-center justify-center border-[3px] border-[#EDF1F5] text-[#EDF1F5]">
                  <Tick size={36} />
                </span>
                <p className="max-w-[24ch] text-[26px] leading-snug font-semibold text-[#EDF1F5]">
                  Section finished: {section.title}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={replay}
                    className="inline-flex min-h-[52px] items-center border-2 border-[#EDF1F5] px-6 text-[19px] font-semibold text-[#EDF1F5] transition-colors hover:bg-[#EDF1F5] hover:text-[#23292F]"
                  >
                    Replay this section
                  </button>
                  <button
                    ref={nextButton}
                    type="button"
                    onClick={() => (isLast ? goTo(0) : goTo(sectionIndex + 1))}
                    className="inline-flex min-h-[52px] items-center border-2 border-[#EDF1F5] bg-[#EDF1F5] px-6 text-[19px] font-semibold text-[#23292F] transition-colors hover:bg-[#FFFFFF]"
                  >
                    {isLast ? 'Back to first section' : 'Next section'}
                  </button>
                </div>
                <p className="text-[17px] text-[#C2CBD4]">
                  Watching a section again is normal. Nothing is lost.
                </p>
              </div>
            )}
          </div>

          {/* Subtitle bar — only show when user wants original text visible */}
          {settings.alwaysOriginal && (
            <div className="border-2 border-t-0 border-[var(--ink)] bg-[var(--ink)] px-6 py-5">
              <p
                className="mx-auto max-w-[42ch] text-center leading-[1.5] font-medium text-[#FAF9F6]"
                style={{ fontSize: `${subtitlePx[settings.subtitleSize]}px` }}
              >
                {complete ? 'End of this section.' : cue.text}
              </p>
            </div>
          )}

          {/* Section progress — visual only */}
          <div className="mt-5 h-3 w-full border-2 border-[var(--rule)]">
            <div
              className="h-full bg-[var(--teal)] transition-[width] duration-150 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 text-[17px] text-[var(--ink-soft)]">
            <span>
              <span className="font-semibold text-[var(--ink)]">{section.title}</span> · sentence{' '}
              {cueIndex + 1} of {section.cues.length}
            </span>
            <span>
              {formatDuration(Math.min(sectionElapsed, total))} / {formatDuration(total)}
            </span>
          </p>

          {/* Playback controls */}
          <h3 className="sr-only">Playback controls</h3>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={() => {
                if (complete) replay()
                else setPlaying((p) => !p)
              }}
              className="min-w-[140px]"
            >
              {complete ? 'Replay' : playing ? 'Pause' : 'Play'}
            </Button>
            <Button onClick={replay}>Replay this section</Button>
            <Button onClick={() => goTo(Math.max(0, sectionIndex - 1))} disabled={sectionIndex === 0}>
              Previous section
            </Button>
            <Button onClick={() => goTo(sectionIndex + 1)} disabled={isLast}>
              Next section
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span id="speed-label" className="text-[18px] font-semibold">
              Signing speed
            </span>
            <div role="group" aria-labelledby="speed-label" className="flex">
              {SPEEDS.map((s, i) => {
                const on = speed === s
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setSpeed(s)
                      onSettingsChange({ ...settings, defaultSpeed: s })
                    }}
                    className={`min-h-[44px] border-2 px-5 text-[18px] transition-colors duration-150 ${
                      i > 0 ? '-ml-0.5' : ''
                    } ${
                      on
                        ? 'z-10 border-[var(--teal)] bg-[var(--teal)] font-bold text-[#FAF9F6]'
                        : 'border-[var(--ink)] font-medium hover:bg-[#EFEDE6]'
                    }`}
                  >
                    {s}x{on ? ' ✓' : ''}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-7">
            <DisclosureStrip />
          </div>

          <p aria-live="polite" aria-atomic="true" className="sr-only">
            {complete
              ? `Section finished: ${section.title}. Choose replay or next section.`
              : `${playing ? 'Playing' : 'Paused'}. ${section.title}. ${cue.text}`}
          </p>
        </main>

        {/* ── Zone C: text panel ────────────────────────────────────── */}
        <aside
          aria-label="Document text"
          className="quiet-scroll border-t-2 border-[var(--rule)] px-5 py-6 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto lg:border-t-0 lg:border-l-2 lg:px-6"
        >
          <h2 className="text-[17px] font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase">
            The text
          </h2>

          <div role="group" aria-label="Choose text version" className="mt-4 flex">
            {(
              [
                ['simplified', 'Simplified'],
                ['original', 'Original'],
                ['gloss', 'NZSL gloss'],
              ] as [TextMode, string][]
            ).map(([mode, label], i) => {
              const on = textMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTextMode(mode)}
                  className={`min-h-[44px] flex-1 border-2 px-2 text-[17px] transition-colors duration-150 ${
                    i > 0 ? '-ml-0.5' : ''
                  } ${
                    on
                      ? 'z-10 border-[var(--teal)] bg-[var(--teal)] font-bold text-[#FAF9F6]'
                      : 'border-[var(--ink)] font-medium hover:bg-[#EFEDE6]'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <h3 className="mt-6 text-[21px] font-semibold">{section.title}</h3>

          {textMode === 'simplified' && (
            <div className="mt-3 flex flex-col gap-4">
              {section.simplified.split('\n\n').map((para) => (
                <p key={para} className="max-w-[66ch] text-[19px] leading-[1.6]">
                  {para}
                </p>
              ))}
            </div>
          )}

          {textMode === 'original' && (
            <p className="mt-3 max-w-[66ch] border-l-[6px] border-[var(--rule)] pl-4 text-[17px] leading-[1.6] text-[var(--ink-soft)]">
              {section.original}
            </p>
          )}

          {textMode === 'gloss' && (
            <div className="mt-3 flex flex-col gap-6">
              {section.cues.map((c, i) => (
                <div
                  key={c.text}
                  className={`border-l-[6px] pl-4 ${
                    i === cueIndex && !complete
                      ? 'border-l-[var(--teal)]'
                      : 'border-l-[var(--rule)]'
                  }`}
                >
                  <p className="text-[15px] font-semibold tracking-wide text-[var(--teal)] uppercase">
                    {nonManualLabel[c.nmm]} — {nonManualMeaning[c.nmm]}
                  </p>
                  <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[19px] font-bold tracking-wide">
                    {c.gloss.map((g, gi) => (
                      <span key={`${g.sign}-${gi}`}>{g.sign}</span>
                    ))}
                  </p>
                  <p className="mt-1.5 text-[17px] text-[var(--ink-soft)]">{c.text}</p>
                </div>
              ))}
            </div>
          )}

          {settings.alwaysOriginal && textMode !== 'original' && (
            <section className="mt-8 border-t-2 border-[var(--rule)] pt-5">
              <h3 className="text-[17px] font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase">
                Original text
              </h3>
              <p className="mt-3 max-w-[66ch] text-[17px] leading-[1.6] text-[var(--ink-soft)]">
                {section.original}
              </p>
            </section>
          )}

          <p className="mt-8 max-w-[60ch] border-t-2 border-[var(--rule)] pt-5 text-[17px] text-[var(--ink-soft)]">
            The original wording is always kept. If the signing and the original do not
            match, the original is the document that counts.
          </p>
        </aside>
      </div>
    </div>
  )
}
