import type { Section } from '../data/document'

export interface DocumentMeta {
  title: string
  source: string
  received: string
  pages: number
}

export type ExplainResult =
  | { readable: true; documentMeta: DocumentMeta; sections: Section[] }
  | { readable: false; issue: string }

interface ExplainPayload {
  image?: string
  mediaType?: string
  text?: string
}

/**
 * Carries a stable `code` alongside the human message, so callers (and future
 * UI) can branch on failure type without string-matching messages. Codes from
 * the server (see classifyError in server/index.js) pass through untouched;
 * client-only failures (timeout, cancel, unreachable) get their own.
 */
export class ApiError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const TIMEOUT_MS = 45_000

export async function explainDocument(
  payload: ExplainPayload,
  opts?: { signal?: AbortSignal },
): Promise<ExplainResult> {
  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), TIMEOUT_MS)
  const signal = opts?.signal
    ? AbortSignal.any([timeoutController.signal, opts.signal])
    : timeoutController.signal

  let response: Response
  try {
    response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (opts?.signal?.aborted) throw new ApiError('Cancelled.', 'cancelled')
      throw new ApiError('This is taking too long — the connection may be slow. Please try again.', 'timeout')
    }
    throw new ApiError('Could not reach the server. Please check your connection and try again.', 'network_error')
  } finally {
    clearTimeout(timeout)
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(
      data.error || 'Something went wrong reading your document. Please try again.',
      data.code || 'unknown_error',
    )
  }

  return data as ExplainResult
}
