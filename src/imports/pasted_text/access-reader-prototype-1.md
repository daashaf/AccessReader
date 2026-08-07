Build a web app prototype called Access Reader. It takes a written document — a scanned letter, a form, a web page — and turns it into New Zealand Sign Language, presented as a signing avatar with running subtitles alongside the simplified English text.
 
The users are Deaf New Zealanders whose first language is NZSL. For them, an English document is a second-language document. This is a translation tool, not a formatting tool.
 
Critical constraint: no audio-only cues anywhere in this interface. No sound alerts, no audio feedback, no listen affordances. Every state change must be visible. Our users cannot hear.
 
DESIGN SYSTEM
 
Use Lexend for all text, falling back to Atkinson Hyperlegible then system sans-serif. No serif fonts anywhere. No italics — use bold for emphasis. Body text 18px minimum, subtitles 24px minimum, line height 1.6, body text capped at 65 to 70 characters per line.
 
Colours: off-white background #FAF9F6, near-black text #1A1A1A, single accent of deep teal #0F5C5C. All text and background pairs must meet WCAG AA contrast at 4.5:1 minimum. The avatar stage sits on a flat mid-tone slate #3A4450 — plain and contrasting, following NZSL interpreter convention. No gradients, no patterns, nothing that competes visually with the hands.
 
Everything must be keyboard reachable with a 3px high-contrast focus ring that is never removed. Touch targets 44 by 44 pixels minimum. Strict heading order, never skipped. All buttons carry real text labels, never icon-only.
 
This is a language tool, not a medical device. No disability iconography, no wheelchair symbols, no compliance badges, no stock photos of disabled people.
 
SCREEN 1 — HOME AND INPUT
 
Heading reads: What would you like translated?
 
Three equally weighted large cards, each with an icon and a text label: Scan a document, Upload a file, Paste a link or text.
 
Below them a short reassurance line: Your document stays private. Nothing is shared.
 
SCREEN 2 — PROCESSING
 
Sequential plain-language step labels, each appearing with a visible tick as it completes: Reading your document, Finding the structure, Translating to NZSL, Preparing the signing.
 
Progress must be entirely visual and never rely on sound. Include a live region for screen reader users.
 
SCREEN 3 — SIGNING VIEW (the core screen)
 
Three zones.
 
Zone A, the avatar stage, sits at the top and takes roughly 50 percent of viewport height. A signing avatar renders against the flat slate background. Framing is critical: show the avatar from head to waist, with the face fully visible and clear space above the head for hands to move into. Never crop the face. Never crop the signing space. The face is not decoration — in NZSL, facial expression carries grammar including question marking, negation and topic marking, so the face must be as visually prominent and well lit as the hands.
 
Directly below the avatar, a subtitle bar with large high-contrast text showing the current sentence in plain English as it is signed. One or two lines maximum, never a scrolling wall of text.
 
Beneath that, playback controls, all with text labels: Play and Pause, Replay this section, speed options of 0.75x, 1x and 1.25x, and Previous section and Next section.
 
Zone B is the section navigator in a left sidebar. A vertical list of document sections the user can jump straight to. This is essential: signing video is linear and cannot be skimmed, so jump navigation is what makes the document usable rather than a video the user must sit through.
 
Label the sections in plain language: What this document is, Who it's from, What you need to do, By when, What happens if you don't. Highlight the currently playing section clearly, and never by colour alone — also use a left border and bold weight. Each row shows a duration and a watched tick once viewed.
 
Zone C is the text panel in a right sidebar, holding the document text with a three-way toggle at the top. Simplified shows plain-language English and is the default. Original shows the untouched source text. NZSL gloss shows the sign gloss sequence with non-manual markers displayed as small annotations above the glosses, such as brow-raise, headshake and topic.
 
The Original option must always be available. We never replace the source document — the user must be able to check the translation against it.
 
SCREEN 4 — SECTION COMPLETE
 
When a section finishes, show a clear visual confirmation and an obvious Next section button, with Replay given equal visual weight. Re-watching is normal expected behaviour, not a failure state.
 
COMING SOON ITEMS
 
In the section navigator, below the sections, show two greyed-out entries labelled Coming soon: What's missing? which checks for unfilled fields or absent information, and Sign to the camera which lets the user sign a reply instead of typing. These must look intentionally disabled, not broken.
 
SCREEN 5 — SETTINGS
 
Simple preferences: subtitle size, default playback speed, avatar size, contrast mode, and a toggle for Always show original text alongside.
 
SAMPLE CONTENT
 
Populate the prototype with a realistic New Zealand government letter — a council rates notice or a benefit entitlement letter. Under Original, show it in its genuine dense, jargon-heavy form. Under Simplified, show short clear plain-language sentences. The gap between the two should be visually obvious, because that contrast is the product.
 
DO NOT INCLUDE
 
No audio elements of any kind. No accessibility overlay button. No floating wheelchair icon. No WCAG compliant badges. No avatar cropped at the neck or shoulders.