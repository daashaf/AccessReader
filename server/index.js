import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, '..', 'dist')

const PORT = process.env.SERVER_PORT || 3001
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY is not set. Requests to /api/explain will fail.')
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const app = express()
app.use(express.json({ limit: '15mb' }))

// Fixed five categories the whole UI (section navigator, signing view) is built
// around. The AI's job is only to fill these in for whatever document arrives —
// it never invents the structure itself.
const SECTION_META = [
  { id: 'what', title: 'What this document is' },
  { id: 'from', title: "Who it's from" },
  { id: 'do', title: 'What you need to do' },
  { id: 'when', title: 'By when' },
  { id: 'else', title: "What happens if you don't" },
]

const SYSTEM_PROMPT = `You are helping translate a document into New Zealand Sign Language for a Deaf reader whose first language is NZSL, not English. For many Deaf readers, a dense English document is effectively a second-language document — your job is the plain-language simplification, not just formatting.

Read the document and sort its content into exactly five fixed categories: "what" (a short overall summary of the entire document), "from" (who it's from), "do" (what the reader needs to do), "when" (by when), "else" (what happens if they don't).

For EACH of the five categories, provide:
- "original": a short excerpt from the actual source document relevant to that category, in its real wording, even if dense or full of jargon. If the document has nothing relevant to a category, write a brief honest note such as "This document does not mention this."
- "simplified": one to four short, plain-language sentences explaining that category, in words a 10-year-old could read. Always include exact dates, amounts, and deadlines when they are present. Never use jargon or legal/medical terminology without explaining it in plain language.

For the "what" category, include a short overall summary of the entire document with the main purpose and important details.

Also provide a short plain-language "title" for the document and, if identifiable, a "source" (who sent it).

If the document cannot be read (blank, too blurry, not a document at all), set "readable" to false and explain simply in "issue" what went wrong and suggest retaking the photo.`

const EXPLAIN_TOOL = {
  name: 'explain_document',
  description: 'Return the document sorted into the five fixed categories this app displays.',
  input_schema: {
    type: 'object',
    properties: {
      readable: { type: 'boolean' },
      issue: { type: 'string' },
      title: { type: 'string' },
      source: { type: 'string' },
      sections: {
        type: 'object',
        properties: Object.fromEntries(
          SECTION_META.map(({ id }) => [
            id,
            {
              type: 'object',
              properties: {
                original: { type: 'string' },
                simplified: { type: 'string' },
              },
              required: ['original', 'simplified'],
            },
          ]),
        ),
        required: SECTION_META.map(({ id }) => id),
      },
    },
    required: ['readable', 'sections'],
  },
}

// --- Deterministic cue/gloss/timing derivation -----------------------------
// Not AI-generated, and not claimed to be: the avatar and its gloss tokens are
// a visual approximation (see SigningAvatar.tsx and the PositioningPanel
// disclosure). This just turns simplified sentences into subtitle cues.

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on',
  'at', 'for', 'and', 'or', 'but', 'this', 'that', 'it', 'you', 'your', 'if',
  'do', 'does', 'with', 'as', 'by', 'from', 'about', 'into', 'than',
])

function splitSentences(text) {
  const matches = String(text || '').match(/[^.!?]+[.!?]*/g)
  return matches ? matches.map((s) => s.trim()).filter(Boolean) : [String(text || '').trim()].filter(Boolean)
}

function glossFor(sentence) {
  const words = sentence.replace(/[^\w\s$%/.-]/g, '').split(/\s+/).filter(Boolean)
  const tokens = words
    .filter((w) => /^\d/.test(w) || w.length > 2 && !STOPWORDS.has(w.toLowerCase()))
    .slice(0, 6)
    .map((w) => ({ sign: w.replace(/[.,]/g, '').toUpperCase() }))
  if (tokens.length) return tokens
  return words.slice(0, 3).map((w) => ({ sign: w.replace(/[.,]/g, '').toUpperCase() || 'SIGN' }))
}

function nmmFor(sentence, isFirst) {
  if (/\?\s*$/.test(sentence)) return 'brow-raise'
  if (/\b(not|cannot|can't|never|n't|no longer)\b/i.test(sentence)) return 'headshake'
  if (isFirst) return 'topic'
  return 'neutral'
}

function secondsFor(sentence) {
  const words = sentence.split(/\s+/).filter(Boolean).length
  return Math.round((Math.max(2.4, Math.min(6, 1.4 + words * 0.32))) * 10) / 10
}

function cuesFor(simplifiedText) {
  const paragraphs = String(simplifiedText || '').split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const sentences = paragraphs.flatMap((p) => splitSentences(p))
  const usable = sentences.length ? sentences : [String(simplifiedText || '').trim()].filter(Boolean)
  return usable.map((text, i) => ({
    text,
    gloss: glossFor(text),
    nmm: nmmFor(text, i === 0),
    seconds: secondsFor(text),
  }))
}

function buildSections(aiSections) {
  return SECTION_META.map(({ id, title }) => {
    const s = aiSections?.[id] || { original: '', simplified: '' }
    return {
      id,
      title,
      original: s.original || '',
      simplified: s.simplified || '',
      cues: cuesFor(s.simplified),
    }
  })
}

// Maps a caught failure to a stable machine-readable code plus a safe,
// user-facing message. The code is the seam between backend ownership (what
// failure modes exist) and frontend ownership (what each one should show or
// do) — new codes can be added here without the frontend changing, and the
// frontend can branch on codes without touching this file.
function classifyError(err) {
  const status = err?.status
  if (status === 429) {
    return { code: 'rate_limited', message: 'Too many requests right now. Please wait a moment and try again.' }
  }
  if (status === 401 || status === 403) {
    return { code: 'auth_error', message: 'Something went wrong on our end. Please try again shortly.' }
  }
  if (status === 400 && /credit balance/i.test(err?.message || '')) {
    return { code: 'insufficient_credit', message: 'Something went wrong on our end. Please try again shortly.' }
  }
  if (status >= 500) {
    return { code: 'upstream_error', message: 'The translation service is having trouble right now. Please try again shortly.' }
  }
  if (err?.code === 'ECONNREFUSED' || err?.cause?.code === 'ECONNREFUSED') {
    return { code: 'network_error', message: 'Could not reach the translation service. Please try again.' }
  }
  return { code: 'unknown_error', message: 'Something went wrong reading your document. Please try again.' }
}

app.post('/api/explain', async (req, res) => {
  try {
    const { image, mediaType, text } = req.body || {}

    if (!image && !text) {
      return res.status(400).json({ code: 'bad_request', error: 'Provide either an image or text.' })
    }

    const content = []
    if (image) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image },
      })
      content.push({ type: 'text', text: 'Here is a photo of the document. Please sort it into the five categories.' })
    } else {
      content.push({ type: 'text', text: `Here is the document text. Please sort it into the five categories:\n\n${text}` })
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1536,
      system: SYSTEM_PROMPT,
      tools: [EXPLAIN_TOOL],
      tool_choice: { type: 'tool', name: 'explain_document' },
      messages: [{ role: 'user', content }],
    })

    const toolUse = response.content.find((block) => block.type === 'tool_use')
    if (!toolUse) {
      return res
        .status(502)
        .json({ code: 'malformed_response', error: 'The AI did not return a structured result. Please try again.' })
    }

    const result = toolUse.input

    if (!result.readable) {
      return res.json({
        readable: false,
        issue: result.issue || 'This document could not be read. Please try again with better lighting.',
      })
    }

    res.json({
      readable: true,
      documentMeta: {
        title: result.title || 'Your document',
        source: result.source || 'Unknown sender',
        received: 'Just now',
        pages: 1,
      },
      sections: buildSections(result.sections),
    })
  } catch (err) {
    console.error(err)
    const { code, message } = classifyError(err)
    res.status(500).json({ code, error: message })
  }
})

// Serves the built frontend from the same process as the API, so a single
// deploy (build once, run this file) is enough — no separate static host
// needed. In local dev, `dist/` doesn't exist yet (Vite's own dev server
// handles the frontend on its own port instead), so this stays inactive
// and `npm run dev`'s two-server setup is unaffected.
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR))
  app.use((req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

const server = app.listen(PORT, () => {
  console.log(`AccessReader backend listening on http://localhost:${PORT}`)
})

server.on('close', () => {
  console.log('SERVER CLOSED')
})

server.on('error', (err) => {
  console.error('SERVER ERROR', err)
})
