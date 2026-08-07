Build a web app prototype called Access Reader. It takes a written document — a scanned letter, a form, a web page — and turns it into New Zealand Sign Language, presented as a signing avatar with running subtitles alongside the simplified English text.

The users are Deaf New Zealanders whose first language is NZSL. For them, an English document is a second-language document. This is a translation tool, not a formatting tool.

Critical constraint: no audio-only cues anywhere in this interface. No sound alerts, no audio feedback, no "listen" affordances. Every state change must be visible. Our users cannot hear.

Global design system
Typeface: Lexend for all text (fallback Atkinson Hyperlegible, then system sans-serif). No serif fonts. No italics — bold for emphasis.
Base size: 18px body minimum. Subtitles 24px minimum. Line height 1.6.
Line length: cap body text at 65–70 characters.
Colour: off-white background (
#FAF9F6), near-black text (
#1A1A1A), single accent of deep teal (
#0F5C5C). All text pairs meet WCAG AA (4.5:1).
Avatar stage background: flat mid-tone slate (
#3A4450) — plain and contrasting, following NZSL interpreter convention. No gradients, no patterns, nothing that competes visually with the hands.
Interaction: everything keyboard-reachable, 3px high-contrast focus ring never removed, 44x44px minimum touch targets. Strict heading order. Text labels on all buttons, never icon-only.
Tone: this is a language tool, not a medical device. No disability iconography, no wheelchair symbols, no compliance badges, no stock photos of disabled people.
Screens
1. Home / Input

Heading: "What would you like translated?"

Three equally weighted large cards, each with an icon and a text label:

Scan a document
Upload a file
Paste a link or text

Below: a short reassurance line — "Your document stays private. Nothing is shared."

2. Processing

Sequential plain-language step labels, each appearing as it completes, with a visible tick:

"Reading your document"
"Finding the structure"
"Translating to NZSL"
"Preparing the signing"

Progress must be entirely visual — never rely on sound. Include a live region for screen-reader users.

3. Signing View — the core screen

This is the main screen. Three zones.

Zone A — Avatar stage (top, dominant, roughly 50% of viewport height): A signing avatar rendered against the flat slate background. Framing is critical: the avatar must be shown from head to waist, with the face fully visible and clear space above the head for hands to move into. Never crop the face. Never crop the signing space. The face is not decoration — in NZSL, facial expression carries grammar (question marking, negation, topic marking), so the face must be as visually prominent and well-lit as the hands.

Below the avatar, a subtitle bar: large text, high contrast, showing the current sentence in plain English as it is signed. One or two lines maximum, never a scrolling wall.

Playback controls beneath, all with text labels:

Play / Pause
Replay this section
Speed: 0.75x / 1x / 1.25x
Previous section / Next section

Zone B — Section navigator (left sidebar): A vertical list of document sections the user can jump straight to. This is essential: signing video is linear and cannot be skimmed, so jump navigation is what makes the document usable rather than a video you must sit through.

Sections labelled in plain language, with the currently playing one clearly highlighted (not by colour alone — also use a left border and bold weight):

What this document is
Who it's from
What you need to do
By when
What happens if you don't

Each row shows a duration and a "watched" tick once viewed.

Zone C — Text panel (right sidebar): The document text, with a three-way toggle at the top:

Simplified — plain-language English, default
Original — the untouched source text
NZSL gloss — the sign gloss sequence with non-manual markers shown as small annotations above the glosses (e.g. brow-raise, headshake, topic)

The Original option must always be available. We never replace the source document — the user must be able to check the translation against it.

4. Section complete state

When a section finishes, show a clear visual confirmation and an obvious "Next section" button — plus "Replay" given equal weight, because re-watching is normal and expected behaviour, not a failure.

5. Coming soon (visible, disabled)

In the section navigator, below the sections, show two greyed-out entries with a "Coming soon" label:

What's missing? — checks for unfilled fields or absent information
Sign to the camera — sign a reply instead of typing

These must look intentionally disabled, not broken.

6. Settings

Simple preferences: subtitle size, playback speed default, avatar size, contrast mode, and a toggle for "Always show original text alongside."

Content to populate the prototype

Use a realistic New Zealand government letter as the sample — a council rates notice or a benefit entitlement letter. Under "Original", show it in its genuine dense, jargon-heavy form. Under "Simplified", show short, clear plain-language sentences. The gap between the two should be visually obvious — that contrast is the product.

Do not include

No audio elements of any kind. No accessibility overlay button. No floating wheelchair icon. No "WCAG compliant" badges. No avatar cropped at the neck or shoulders.