import { useCallback, useEffect, useRef, useState } from 'react'
import HomeScreen from './components/HomeScreen'
import type { DocumentInput } from './components/HomeScreen'
import ProcessingScreen from './components/ProcessingScreen'
import SigningView from './components/SigningView'
import SettingsScreen, { defaultSettings } from './components/SettingsScreen'
import type { Settings } from './components/SettingsScreen'
import { documentMeta as sampleMeta, sections as sampleSections } from './data/document'
import type { Section } from './data/document'
import { explainDocument, ApiError } from './lib/api'
import type { DocumentMeta } from './lib/api'

type Screen = 'home' | 'processing' | 'signing' | 'settings'

interface LoadedDocument {
  meta: DocumentMeta
  sections: Section[]
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loadedDocument, setLoadedDocument] = useState<LoadedDocument | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastText, setLastText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // Contrast mode is a document-level preference, so it drives a root attribute
  // rather than being threaded through every component.
  useEffect(() => {
    document.documentElement.dataset.contrast = settings.contrast
  }, [settings.contrast])

  const handleStart = useCallback(async (input: DocumentInput) => {
    setError(null)

    if (input.kind === 'text') setLastText(input.text)

    if (input.kind === 'sample') {
      setLoadedDocument({ meta: sampleMeta, sections: sampleSections })
      setScreen('signing')
      return
    }

    setReady(false)
    setScreen('processing')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await explainDocument(
        input.kind === 'image'
          ? { image: input.data, mediaType: input.mediaType }
          : { text: input.text },
        { signal: controller.signal },
      )

      if (!result.readable) {
        setError(result.issue)
        setScreen('home')
        return
      }

      setLoadedDocument({ meta: result.documentMeta, sections: result.sections })
      setReady(true)
      setLastText('')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'cancelled') {
        setScreen('home')
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong reading your document. Please try again.')
      setScreen('home')
    } finally {
      abortRef.current = null
    }
  }, [])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:border-2 focus:border-[var(--ink)] focus:bg-[var(--paper)] focus:px-4 focus:py-2 focus:text-[18px] focus:font-semibold"
      >
        Skip to main content
      </a>

      <div id="main">
        {screen === 'home' && (
          <HomeScreen onStart={handleStart} error={error} initialText={lastText} />
        )}
        {screen === 'processing' && (
          <ProcessingScreen ready={ready} onDone={() => setScreen('signing')} onCancel={handleCancel} />
        )}
        {screen === 'signing' && loadedDocument && (
          <SigningView
            documentMeta={loadedDocument.meta}
            sections={loadedDocument.sections}
            settings={settings}
            onExit={() => setScreen('home')}
            onOpenSettings={() => setScreen('settings')}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onChange={setSettings}
            onBack={() => setScreen('signing')}
          />
        )}
      </div>
    </div>
  )
}
