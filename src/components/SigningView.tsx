import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SigningAvatar from './SigningAvatar'
import { Button, Tick, DisclosureStrip } from './ui'
import {
  documentMeta,
  formatDuration,
  nonManualLabel,
  nonManualMeaning,
  sections,
  sectionSeconds,
  type NonManual,
} from '../data/document'
import type { Settings } from './SettingsScreen'

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

const nmmGrammarExplanation: Record<NonManual, string> = {
  'brow-raise':
    'In NZSL, raised eyebrows mark yes/no questions or set up a topic at the beginning of a clause. They signal that a response or related statement is coming.',
  'brow-furrow':
    'In NZSL, furrowed eyebrows mark WH- questions (who, what, where, when, why, how), directing focus to the specific information being asked.',
  headshake:
    'In NZSL, a headshake acts as a core grammatical negation marker, accompanying or modifying the action verb to mean "not".',
  topic:
    'In NZSL, topic marking moves the main subject or timeline context to the front of the sentence, framed with raised brows and head tilt.',
  neutral:
    'Neutral facial posture is used for standard declarative statements and factual narrative delivery in NZSL.',
}

interface Props {
  settings: Settings
  onExit: () => void
  onOpenSettings: () => void
}

export default function SigningView({ settings, onExit, onOpenSettings }: Props) {
  const [sectionIndex, setSectionIndex] = useState(0)
  const [cueIndex, setCueIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<number>(settings.defaultSpeed)
  const [complete, setComplete] = useState(false)
  const [watched, setWatched] = useState<string[]>([])
  const [textMode, setTextMode] = useState<TextMode>('simplified')
  const [focusMode, setFocusMode] = useState(false)
  const [showNmmInfo, setShowNmmInfo] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  const nextButton = useRef<HTMLButtonElement>(null)

  const section = sections[sectionIndex]
  const cue = section.cues[cueIndex]

  // Playback clock. 120ms ticks drive subtitles and the progress bar.
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

  const seekToCue = useCallback((index: number, autoplay = true) => {
    setCueIndex(index)
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

  // Keyboard shortcuts listener scoped to this screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        if (complete) replay()
        else setPlaying((p) => !p)
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        replay()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (cueIndex > 0) {
          seekToCue(cueIndex - 1)
        } else if (sectionIndex > 0) {
          goTo(sectionIndex - 1)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (cueIndex + 1 < section.cues.length) {
          seekToCue(cueIndex + 1)
        } else if (sectionIndex + 1 < sections.length) {
          goTo(sectionIndex + 1)
        } else {
          setPlaying(false)
          setComplete(true)
        }
      } else if (e.key === '1') {
        e.preventDefault()
        setSpeed(0.75)
      } else if (e.key === '2') {
        e.preventDefault()
        setSpeed(1)
      } else if (e.key === '3') {
        e.preventDefault()
        setSpeed(1.25)
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        setTextMode((m) =>
          m === 'simplified' ? 'original' : m === 'original' ? 'gloss' : 'simplified',
        )
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setFocusMode((f) => !f)
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShowShortcutsModal((s) => !s)
      } else if (e.key === 'Escape') {
        if (showShortcutsModal) setShowShortcutsModal(false)
        if (showNmmInfo) setShowNmmInfo(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    complete,
    cueIndex,
    goTo,
    replay,
    section.cues.length,
    sectionIndex,
    seekToCue,
    showNmmInfo,
    showShortcutsModal,
  ])

  const sectionElapsed = useMemo(
    () => section.cues.slice(0, cueIndex).reduce((t, c) => t + c.seconds, 0) + elapsed,
    [section, cueIndex, elapsed],
  )
  const total = sectionSeconds(section)
  const isLast = sectionIndex === sections.length - 1

  const cueSegments = useMemo(() => {
    let currentStart = 0
    return section.cues.map((c, i) => {
      const start = currentStart
      currentStart += c.seconds
      return {
        index: i,
        start,
        end: currentStart,
        widthPct: (c.seconds / total) * 100,
        text: c.text,
      }
    })
  }, [section.cues, total])

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

        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="quiet"
            onClick={() => setFocusMode((f) => !f)}
            className="px-2"
            title="Toggle Focus Mode (F)"
          >
            {focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
          </Button>
          <Button
            variant="quiet"
            onClick={() => setShowShortcutsModal(true)}
            className="px-2"
            title="Keyboard shortcuts (?)"
          >
            Shortcuts (?)
          </Button>
          <Button variant="quiet" onClick={onOpenSettings} className="px-0">
            Settings
          </Button>
        </div>
      </header>

      <div
        className={`grid items-start gap-0 ${
          focusMode
            ? 'lg:grid-cols-[minmax(0,1fr)_420px]'
            : 'lg:grid-cols-[300px_minmax(0,1fr)_380px]'
        }`}
      >
        {/* ── Zone B: section navigator ─────────────────────────────── */}
        <nav
          aria-label="Document sections"
          className={`quiet-scroll border-b-2 border-[var(--rule)] px-5 py-6 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto lg:border-r-2 lg:border-b-0 lg:px-6 ${
            focusMode ? 'hidden' : 'block'
          }`}
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

            {/* Non-manual marker readout with popover explanation */}
            {cue.nmm !== 'neutral' && !complete && (
              <div className="absolute top-4 left-4 z-20">
                <button
                  type="button"
                  onClick={() => setShowNmmInfo((v) => !v)}
                  aria-expanded={showNmmInfo}
                  aria-label="Non-manual marker grammatical explanation"
                  className="border-2 border-[#8FA3B5] bg-[#23292F]/90 px-3 py-1.5 text-left text-[15px] font-semibold tracking-wide text-[#EDF1F5] uppercase transition-colors hover:bg-[#23292F] hover:border-[#FAF9F6] cursor-pointer"
                >
                  {nonManualLabel[cue.nmm]} · {nonManualMeaning[cue.nmm]} ℹ
                </button>
                {showNmmInfo && (
                  <div className="mt-2 max-w-sm border-2 border-[var(--ink)] bg-[#FAF9F6] p-4 text-[var(--ink)] shadow-lg">
                    <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2 mb-2">
                      <span className="text-[14px] font-bold uppercase tracking-wider text-[var(--teal)]">
                        NZSL Grammar: {nonManualLabel[cue.nmm]}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowNmmInfo(false)}
                        className="text-[16px] font-bold px-1 hover:text-[var(--teal)] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[15px] leading-relaxed">
                      {nmmGrammarExplanation[cue.nmm]}
                    </p>
                  </div>
                )}
              </div>
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

          {/* Subtitle bar */}
          <div className="border-2 border-t-0 border-[var(--ink)] bg-[var(--ink)] px-6 py-5">
            <p
              className="mx-auto max-w-[42ch] text-center leading-[1.5] font-medium text-[#FAF9F6]"
              style={{ fontSize: `${subtitlePx[settings.subtitleSize]}px` }}
            >
              {complete ? 'End of this section.' : cue.text}
            </p>
          </div>

          {/* Interactive Scrub Bar — per cue marker */}
          <div className="mt-5">
            <div
              role="region"
              aria-label="Section sentence timeline scrubber"
              className="relative flex h-4 w-full cursor-pointer overflow-hidden border-2 border-[var(--rule)] bg-[#EFEDE6]"
            >
              {cueSegments.map((seg) => {
                const isActive = seg.index === cueIndex && !complete
                const isPassed = seg.index < cueIndex || complete
                return (
                  <button
                    key={`${seg.text}-${seg.index}`}
                    type="button"
                    onClick={() => seekToCue(seg.index)}
                    title={`Jump to sentence ${seg.index + 1}: "${seg.text}"`}
                    style={{ width: `${seg.widthPct}%` }}
                    className={`relative h-full border-r-2 border-[var(--paper)] last:border-r-0 transition-colors ${
                      isActive
                        ? 'bg-[var(--teal)]'
                        : isPassed
                          ? 'bg-[#8CA8A3]'
                          : 'hover:bg-[#CBD6D3]'
                    }`}
                  >
                    {isActive && !complete && (
                      <div
                        className="h-full bg-[var(--ink)] opacity-30 transition-[width] duration-150 ease-linear"
                        style={{
                          width: `${Math.min(
                            100,
                            (elapsed / section.cues[seg.index].seconds) * 100,
                          )}%`,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
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
                    onClick={() => setSpeed(s)}
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

          {/* 1. Simplified mode active sentence highlighting */}
          {textMode === 'simplified' && (
            <div className="mt-3 flex flex-col gap-3">
              {section.cues.map((c, i) => {
                const active = i === cueIndex && !complete
                return (
                  <button
                    key={`${c.text}-${i}`}
                    type="button"
                    onClick={() => seekToCue(i)}
                    className={`w-full text-left border-l-[6px] p-3.5 transition-all duration-150 rounded-r-md cursor-pointer ${
                      active
                        ? 'border-l-[var(--teal)] bg-[#E6EFEE] font-medium shadow-xs'
                        : 'border-l-transparent bg-transparent hover:bg-[#EFEDE6]/60 text-[var(--ink)]'
                    }`}
                  >
                    <p className="max-w-[66ch] text-[19px] leading-[1.6]">{c.text}</p>
                  </button>
                )
              })}
            </div>
          )}

          {/* Original mode left undivided as single block */}
          {textMode === 'original' && (
            <p className="mt-3 max-w-[66ch] border-l-[6px] border-[var(--rule)] pl-4 text-[17px] leading-[1.6] text-[var(--ink-soft)]">
              {section.original}
            </p>
          )}

          {/* 3. Gloss mode click-to-seek */}
          {textMode === 'gloss' && (
            <div className="mt-3 flex flex-col gap-4">
              {section.cues.map((c, i) => {
                const active = i === cueIndex && !complete
                return (
                  <button
                    key={`${c.text}-${i}`}
                    type="button"
                    onClick={() => seekToCue(i)}
                    className={`w-full text-left border-l-[6px] p-3.5 transition-colors duration-150 rounded-r-md cursor-pointer ${
                      active
                        ? 'border-l-[var(--teal)] bg-[#E6EFEE]'
                        : 'border-l-[var(--rule)] hover:bg-[#EFEDE6]/60'
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
                  </button>
                )
              })}
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

      {/* Shortcuts reference modal overlay */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="w-full max-w-md border-2 border-[var(--ink)] bg-[#FAF9F6] p-6 text-[var(--ink)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-[var(--rule)] pb-3 mb-4">
              <h3 className="text-[20px] font-bold">Keyboard Shortcuts</h3>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="text-[20px] font-bold px-2 py-1 hover:bg-[#EFEDE6] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <ul className="flex flex-col gap-2.5 text-[16px]">
              <li className="flex justify-between items-center">
                <span>Play / Pause</span>
                <span>
                  <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                    Space
                  </kbd>{' '}
                  or{' '}
                  <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                    K
                  </kbd>
                </span>
              </li>
              <li className="flex justify-between items-center">
                <span>Replay section</span>
                <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                  R
                </kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>Previous / Next cue</span>
                <span>
                  <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                    ←
                  </kbd>{' '}
                  /{' '}
                  <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                    →
                  </kbd>
                </span>
              </li>
              <li className="flex justify-between items-center">
                <span>Signing speed</span>
                <span>
                  <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                    1
                  </kbd>{' '}
                  <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                    2
                  </kbd>{' '}
                  <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                    3
                  </kbd>
                </span>
              </li>
              <li className="flex justify-between items-center">
                <span>Cycle text mode</span>
                <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                  T
                </kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>Focus / Theater mode</span>
                <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                  F
                </kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>Toggle shortcuts guide</span>
                <kbd className="border border-[var(--ink)] bg-[#EFEDE6] px-2 py-0.5 font-mono text-[14px]">
                  ?
                </kbd>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
