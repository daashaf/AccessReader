// Sample document for the prototype: a Wellington City Council rates notice.
// The Original text is deliberately reproduced in its genuine dense, clause-heavy
// register. The Simplified text is what the AI simplify pass produces. The gap
// between the two columns is the product.

export type NonManual = 'brow-raise' | 'brow-furrow' | 'headshake' | 'topic' | 'neutral'

export interface Gloss {
  sign: string
  nmm?: NonManual
}

export interface Cue {
  /** Plain-English subtitle shown while this cue is signed. */
  text: string
  /** NZSL gloss sequence for this cue. */
  gloss: Gloss[]
  /** Dominant non-manual marker carried across the cue. */
  nmm: NonManual
  /** Seconds at 1x. */
  seconds: number
}

export interface Section {
  id: string
  /** Plain-language label, not the document's own heading. */
  title: string
  original: string
  simplified: string
  cues: Cue[]
}

export const nonManualLabel: Record<NonManual, string> = {
  'brow-raise': 'brow raise',
  'brow-furrow': 'brow furrow',
  headshake: 'headshake',
  topic: 'topic',
  neutral: 'neutral',
}

export const nonManualMeaning: Record<NonManual, string> = {
  'brow-raise': 'yes/no question',
  'brow-furrow': 'wh- question',
  headshake: 'negation',
  topic: 'topic marking',
  neutral: 'statement',
}

export const documentMeta = {
  title: 'Rates Assessment and Instalment Notice 2026/27',
  source: 'Wellington City Council',
  received: 'Scanned 7 August 2026',
  pages: 2,
}

export const sections: Section[] = [
  {
    id: 'what',
    title: 'What this document is',
    original:
      'RATES ASSESSMENT AND INSTALMENT NOTICE issued pursuant to sections 44 and 45 of the Local Government (Rating) Act 2002 in respect of the rating unit described hereunder for the financial year commencing 1 July 2026 and ending 30 June 2027. This notice constitutes an assessment of rates payable and is not a statement of account. Valuation Reference 27140/108/02. Rating unit: 14A Ellice Street, Mount Victoria, Wellington 6011. Capital Value $1,120,000. Land Value $690,000 as at the general revaluation dated 1 September 2025.',
    simplified:
      'This is your rates bill for your house at 14A Ellice Street.\n\nIt covers one year. It starts 1 July 2026 and ends 30 June 2027.\n\nThe council says your house is worth $1,120,000.',
    cues: [
      {
        text: 'This is your rates bill.',
        gloss: [{ sign: 'THIS' }, { sign: 'PAPER' }, { sign: 'RATES' }, { sign: 'BILL' }],
        nmm: 'topic',
        seconds: 3.2,
      },
      {
        text: 'It is for your house at 14A Ellice Street.',
        gloss: [
          { sign: 'YOUR' },
          { sign: 'HOUSE' },
          { sign: 'ADDRESS' },
          { sign: 'fs-ELLICE' },
          { sign: 'STREET' },
        ],
        nmm: 'neutral',
        seconds: 4.1,
      },
      {
        text: 'It covers one year, July 2026 to June 2027.',
        gloss: [
          { sign: 'TIME' },
          { sign: 'ONE-YEAR' },
          { sign: 'JULY' },
          { sign: 'UP-TO' },
          { sign: 'JUNE' },
        ],
        nmm: 'topic',
        seconds: 4.4,
      },
      {
        text: 'The council says your house is worth $1,120,000.',
        gloss: [{ sign: 'COUNCIL' }, { sign: 'SAY' }, { sign: 'HOUSE' }, { sign: 'WORTH' }, { sign: '1.12-MILLION' }],
        nmm: 'neutral',
        seconds: 4.6,
      },
    ],
  },
  {
    id: 'from',
    title: "Who it's from",
    original:
      'Wellington City Council, Revenue and Receivables, PO Box 2199, Wellington 6140. Enquiries relating to this assessment should be directed to the Rates Administration Unit. Objections to the valuation particulars must be made to Quotable Value Limited as the Council’s valuation service provider and not to the Council. This notice is issued under delegated authority of the Chief Financial Officer.',
    simplified:
      'This letter is from Wellington City Council.\n\nThe Rates team sent it.\n\nIf you think the house value is wrong, you do not talk to the council. You talk to Quotable Value.',
    cues: [
      {
        text: 'This letter is from Wellington City Council.',
        gloss: [{ sign: 'LETTER' }, { sign: 'FROM' }, { sign: 'WELLINGTON' }, { sign: 'COUNCIL' }],
        nmm: 'topic',
        seconds: 3.6,
      },
      {
        text: 'The Rates team sent it.',
        gloss: [{ sign: 'RATES' }, { sign: 'TEAM' }, { sign: 'SEND' }],
        nmm: 'neutral',
        seconds: 2.8,
      },
      {
        text: 'Do you think the house value is wrong?',
        gloss: [{ sign: 'HOUSE' }, { sign: 'WORTH' }, { sign: 'WRONG' }, { sign: 'YOU-THINK' }],
        nmm: 'brow-raise',
        seconds: 3.9,
      },
      {
        text: 'Do not contact the council about that.',
        gloss: [{ sign: 'COUNCIL' }, { sign: 'CONTACT' }, { sign: 'NOT' }],
        nmm: 'headshake',
        seconds: 3.1,
      },
      {
        text: 'Contact Quotable Value instead.',
        gloss: [{ sign: 'fs-QV' }, { sign: 'COMPANY' }, { sign: 'CONTACT' }, { sign: 'INSTEAD' }],
        nmm: 'neutral',
        seconds: 3.4,
      },
    ],
  },
  {
    id: 'do',
    title: 'What you need to do',
    original:
      'The total rates assessed for the year are $2,736.80 (inclusive of GST), payable by four equal instalments. Instalment 1 in the sum of $684.20 is now due. Payment may be effected by direct debit authority, internet banking to 01-0505-0100158-00 quoting the valuation reference as particulars, or in person at any Council Service Centre. Where a direct debit authority is already in force no further action is required and this notice is issued for information purposes only.',
    simplified:
      'You need to pay $684.20 now.\n\nThis is the first of four payments. The whole year costs $2,736.80.\n\nYou can pay online. Use bank number 01-0505-0100158-00. Put 27140/108/02 in the reference box.\n\nAlready set up direct debit? Then you do not need to do anything.',
    cues: [
      {
        text: 'You need to pay $684.20 now.',
        gloss: [{ sign: 'YOU' }, { sign: 'MUST' }, { sign: 'PAY' }, { sign: '684-DOLLAR' }, { sign: 'NOW' }],
        nmm: 'neutral',
        seconds: 4.2,
      },
      {
        text: 'This is the first of four payments.',
        gloss: [{ sign: 'THIS' }, { sign: 'FIRST' }, { sign: 'FOUR' }, { sign: 'PAY-LIST' }],
        nmm: 'topic',
        seconds: 3.5,
      },
      {
        text: 'The whole year costs $2,736.80.',
        gloss: [{ sign: 'ALL-YEAR' }, { sign: 'TOTAL' }, { sign: '2736-DOLLAR' }],
        nmm: 'neutral',
        seconds: 3.8,
      },
      {
        text: 'You can pay online using internet banking.',
        gloss: [{ sign: 'PAY' }, { sign: 'CAN' }, { sign: 'INTERNET' }, { sign: 'BANK' }],
        nmm: 'neutral',
        seconds: 3.6,
      },
      {
        text: 'Put 27140/108/02 in the reference box.',
        gloss: [{ sign: 'NUMBER' }, { sign: 'fs-REF' }, { sign: 'WRITE' }, { sign: 'BOX' }],
        nmm: 'topic',
        seconds: 4.0,
      },
      {
        text: 'Do you already have direct debit set up?',
        gloss: [{ sign: 'DIRECT-DEBIT' }, { sign: 'ALREADY' }, { sign: 'FINISH' }, { sign: 'YOU' }],
        nmm: 'brow-raise',
        seconds: 3.7,
      },
      {
        text: 'Then you do not need to do anything.',
        gloss: [{ sign: 'YOU' }, { sign: 'DO' }, { sign: 'NOTHING' }, { sign: 'NEED-NOT' }],
        nmm: 'headshake',
        seconds: 3.4,
      },
    ],
  },
  {
    id: 'when',
    title: 'By when',
    original:
      'Instalment 1 is due and payable on or before 4.00pm, 20 September 2026. Payments received after the due date will be treated as having been received on the next business day. Subsequent instalment due dates are 20 December 2026, 20 March 2027 and 20 June 2027.',
    simplified:
      'Pay before 4pm on Sunday 20 September 2026.\n\nAfter that time, the council counts your payment as late.\n\nThe next three payments are due 20 December, 20 March and 20 June.',
    cues: [
      {
        text: 'Pay before 4pm on 20 September 2026.',
        gloss: [{ sign: 'DATE-20' }, { sign: 'SEPTEMBER' }, { sign: 'TIME-4' }, { sign: 'BEFORE' }, { sign: 'PAY' }],
        nmm: 'topic',
        seconds: 4.5,
      },
      {
        text: 'After that time your payment counts as late.',
        gloss: [{ sign: 'AFTER' }, { sign: 'THAT' }, { sign: 'PAY' }, { sign: 'LATE' }],
        nmm: 'neutral',
        seconds: 3.8,
      },
      {
        text: 'Three more payments come later in the year.',
        gloss: [{ sign: 'THREE' }, { sign: 'MORE' }, { sign: 'PAY-LIST' }, { sign: 'LATER' }],
        nmm: 'neutral',
        seconds: 3.5,
      },
    ],
  },
  {
    id: 'else',
    title: "What happens if you don't",
    original:
      'Pursuant to section 57 and section 58 of the Local Government (Rating) Act 2002 the Council has resolved to add a penalty of 10 percent to any portion of an instalment remaining unpaid after the relevant due date. A further penalty of 10 percent may be added to any rates assessed in previous financial years which remain unpaid. The Council may commence recovery proceedings in respect of unpaid rates and may register a charging order against the rating unit.',
    simplified:
      'If you pay late, the council adds 10% more.\n\nThat is $68.42 extra on this payment.\n\nIf you do not pay for a long time, the council can take you to court. They can also put a legal claim on your house.\n\nCannot pay? Phone the council early. They can make a payment plan with you.',
    cues: [
      {
        text: 'If you pay late, the council adds 10% more.',
        gloss: [{ sign: 'SUPPOSE' }, { sign: 'PAY' }, { sign: 'LATE' }, { sign: 'COUNCIL' }, { sign: 'ADD' }, { sign: 'TEN-PERCENT' }],
        nmm: 'topic',
        seconds: 5.0,
      },
      {
        text: 'That is $68.42 extra on this payment.',
        gloss: [{ sign: 'THAT' }, { sign: '68-DOLLAR' }, { sign: 'EXTRA' }],
        nmm: 'neutral',
        seconds: 3.3,
      },
      {
        text: 'If you never pay, the council can take you to court.',
        gloss: [{ sign: 'PAY' }, { sign: 'NEVER' }, { sign: 'COUNCIL' }, { sign: 'COURT' }, { sign: 'CAN' }],
        nmm: 'headshake',
        seconds: 4.6,
      },
      {
        text: 'They can also put a legal claim on your house.',
        gloss: [{ sign: 'ALSO' }, { sign: 'LAW' }, { sign: 'CLAIM' }, { sign: 'YOUR' }, { sign: 'HOUSE' }],
        nmm: 'neutral',
        seconds: 4.2,
      },
      {
        text: 'Cannot pay? Contact the council early.',
        gloss: [{ sign: 'PAY' }, { sign: 'CANNOT' }, { sign: 'COUNCIL' }, { sign: 'CONTACT' }, { sign: 'EARLY' }],
        nmm: 'brow-raise',
        seconds: 4.4,
      },
      {
        text: 'They can make a payment plan with you.',
        gloss: [{ sign: 'THEY' }, { sign: 'PAY' }, { sign: 'PLAN' }, { sign: 'MAKE' }, { sign: 'WITH-YOU' }],
        nmm: 'neutral',
        seconds: 4.0,
      },
    ],
  },
]

export const sectionSeconds = (section: Section) =>
  section.cues.reduce((total, cue) => total + cue.seconds, 0)

export const formatDuration = (seconds: number) => {
  const whole = Math.round(seconds)
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}
