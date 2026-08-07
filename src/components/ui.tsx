import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Every button carries a real text label — never icon-only — and every target
 * clears 44x44px. Variants differ in weight and in border, not in colour alone.
 */
type Variant = 'primary' | 'secondary' | 'quiet'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const base =
  'inline-flex min-h-[44px] items-center justify-center gap-2.5 px-5 py-2.5 text-[18px] leading-tight font-medium transition-colors duration-150 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--teal)] text-[#FAF9F6] border-2 border-[var(--teal)] hover:bg-[#0a4242] hover:border-[#0a4242] disabled:bg-[#8A8A85] disabled:border-[#8A8A85]',
  secondary:
    'bg-transparent text-[var(--ink)] border-2 border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] disabled:border-[#8A8A85] disabled:text-[#6B6B6B] disabled:hover:bg-transparent disabled:hover:text-[#6B6B6B]',
  quiet:
    'bg-transparent text-[var(--ink)] border-2 border-transparent underline underline-offset-4 decoration-2 hover:decoration-[3px]',
}

export function Button({ variant = 'secondary', className = '', ...rest }: ButtonProps) {
  return <button type="button" className={`${base} ${variants[variant]} ${className}`} {...rest} />
}

/** A visible tick. Always paired with text — never the only signal. */
export function Tick({ size = 22, colour }: { size?: number; colour?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M4 12.5 L9.5 18 L20 6"
        stroke={colour ?? 'currentColor'}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The honesty surfaces.
 *
 * Scope doc, Known Risks 2: the absence of Deaf input must be said *first*, and
 * Deaf-led co-design must be an explicit next step rather than a footnote. The
 * disclosure rule says the same about what is live versus pre-rendered. So these
 * statements live in the product, not only in the pitch.
 */

export function PositioningPanel() {
  return (
    <section
      aria-labelledby="positioning-heading"
      className="border-2 border-[var(--ink)] p-7 md:p-9"
    >
      <h2 id="positioning-heading" className="text-[26px] leading-tight font-semibold">
        What this is, and what it is not
      </h2>

      <div className="mt-6 grid gap-7 md:grid-cols-2">
        <div>
          <h3 className="text-[19px] font-semibold">
            This does not replace NZSL interpreters
          </h3>
          <p className="mt-2 max-w-[62ch] text-[18px] text-[var(--ink-soft)]">
            The World Federation of the Deaf and WASLI have warned against signing
            avatars being used as a replacement for human interpreters, and they are
            right. Access Reader is for the everyday documents that will never get an
            interpreter at all — the rates notice, the tenancy letter, the form in the
            letterbox.
          </p>
        </div>

        <div>
          <h3 className="text-[19px] font-semibold">
            No Deaf people built this. That is a problem.
          </h3>
          <p className="mt-2 max-w-[62ch] text-[18px] text-[var(--ink-soft)]">
            This prototype was made in 48 hours by a team with no Deaf members. The WFD
            position is that Deaf people should lead development of AI tools using their
            own sign languages. We agree. Deaf-led co-design is the next step, not a
            later one.
          </p>
        </div>

        <div>
          <h3 className="text-[19px] font-semibold">The signing is generated</h3>
          <p className="mt-2 max-w-[62ch] text-[18px] text-[var(--ink-soft)]">
            The simplify and gloss passes are real and run live on your document. The
            avatar motion is generated from that gloss — it is not recorded from a Deaf
            signer, and it will get things wrong. Check anything that matters against the
            original.
          </p>
        </div>

        <div>
          <h3 className="text-[19px] font-semibold">One variety of NZSL</h3>
          <p className="mt-2 max-w-[62ch] text-[18px] text-[var(--ink-soft)]">
            NZSL has regional and generational variation. This version signs one variety
            only, and does not yet handle dialect. If the signing does not match the NZSL
            you use, that is a limit of this tool, not of your language.
          </p>
        </div>
      </div>
    </section>
  )
}

/** Persistent, compact version. Sits with the document, never dismissible. */
export function DisclosureStrip() {
  return (
    <p className="border-l-[6px] border-[var(--teal)] bg-[#E6EFEE] px-5 py-4 text-[17px] leading-[1.6]">
      <span className="font-bold">This signing is generated by AI, not by a Deaf signer.</span>{' '}
      It can be wrong, especially on legal and financial wording. The original text stays
      beside it — that is the version that counts.
    </p>
  )
}

export function Roadmap() {
  const items: [string, string][] = [
    [
      'Deaf-led validation and co-design',
      'Deaf NZSL users leading the translation quality work, not reviewing it at the end.',
    ],
    [
      'Regional NZSL variation',
      'Handling dialect and generational variation instead of signing one variety.',
    ],
    [
      'More document types',
      'Tenancy agreements, medical forms and benefit letters beyond the rates notice.',
    ],
  ]
  return (
    <section aria-labelledby="roadmap-heading">
      <h2 id="roadmap-heading" className="text-[22px] font-semibold">
        Not built yet
      </h2>
      <ul className="mt-4 flex flex-col gap-4">
        {items.map(([title, note]) => (
          <li key={title} className="border-t-2 border-[var(--rule)] pt-4">
            <span className="block text-[19px] font-semibold">{title}</span>
            <span className="mt-1 block max-w-[62ch] text-[17px] text-[var(--ink-soft)]">
              {note}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
