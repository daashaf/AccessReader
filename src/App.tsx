import { useEffect, useState } from 'react'
import HomeScreen from './components/HomeScreen'
import ProcessingScreen from './components/ProcessingScreen'
import SigningView from './components/SigningView'
import SettingsScreen, { defaultSettings, type Settings } from './components/SettingsScreen'
import type { DocumentInput } from './types/document'

type Screen = 'home' | 'processing' | 'signing' | 'settings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [, setDocumentInput] = useState<DocumentInput | null>(null)

  function handleDocumentStart(input: DocumentInput) {
    setDocumentInput(input)
    setScreen('processing')
  }

  // Contrast mode is a document-level preference, so it drives a root attribute
  // rather than being threaded through every component.
  useEffect(() => {
    document.documentElement.dataset.contrast = settings.contrast
  }, [settings.contrast])

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
          <HomeScreen
            onStart={handleDocumentStart}
            onOpenSample={() => setScreen('signing')}
          />
        )}
        {screen === 'processing' && <ProcessingScreen onDone={() => setScreen('signing')} />}
        {screen === 'signing' && (
          <SigningView
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
