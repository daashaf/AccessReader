import { Button } from './ui'

export type Contrast = 'default' | 'high'
export type SubtitleSize = 'medium' | 'large' | 'x-large'
export type AvatarSize = 'standard' | 'large'

export interface Settings {
  contrast: Contrast
  subtitleSize: SubtitleSize
  avatarSize: AvatarSize
  defaultSpeed: 0.75 | 1 | 1.25
  alwaysOriginal: boolean
}

export const defaultSettings: Settings = {
  contrast: 'default',
  subtitleSize: 'medium',
  avatarSize: 'standard',
  defaultSpeed: 1,
  alwaysOriginal: false,
}

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
  onBack: () => void
}

function OptionGroup<T extends string | number>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: [T, string][]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="text-[18px] font-semibold">{legend}</legend>
      <div role="group" className="mt-3 flex flex-wrap">
        {options.map(([option, label], i) => {
          const on = option === value
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(option)}
              className={`min-h-[44px] border-2 px-5 text-[18px] transition-colors duration-150 ${
                i > 0 ? '-ml-0.5' : ''
              } ${
                on
                  ? 'z-10 border-[var(--teal)] bg-[var(--teal)] font-bold text-[#FAF9F6]'
                  : 'border-[var(--ink)] font-medium hover:bg-[#EFEDE6]'
              }`}
            >
              {label}
              {on ? ' ✓' : ''}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function SettingsScreen({ settings, onChange, onBack }: Props) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-x-6 border-b-2 border-[var(--rule)] px-6 py-4 md:px-8">
        <Button variant="quiet" onClick={onBack} className="px-0">
          ← Back to document
        </Button>
        <h1 className="text-[20px] leading-tight font-semibold">Settings</h1>
      </header>

      <main className="mx-auto flex max-w-[62ch] flex-col gap-9 px-6 py-8 md:px-8">
        <OptionGroup
          legend="Contrast"
          value={settings.contrast}
          onChange={(v) => set('contrast', v)}
          options={[
            ['default', 'Default'],
            ['high', 'High contrast'],
          ]}
        />

        <OptionGroup
          legend="Subtitle size"
          value={settings.subtitleSize}
          onChange={(v) => set('subtitleSize', v)}
          options={[
            ['medium', 'Medium'],
            ['large', 'Large'],
            ['x-large', 'Extra large'],
          ]}
        />

        <OptionGroup
          legend="Avatar size"
          value={settings.avatarSize}
          onChange={(v) => set('avatarSize', v)}
          options={[
            ['standard', 'Standard'],
            ['large', 'Large'],
          ]}
        />

        <OptionGroup
          legend="Default signing speed"
          value={settings.defaultSpeed}
          onChange={(v) => set('defaultSpeed', v)}
          options={[
            [0.75, '0.75x'],
            [1, '1x'],
            [1.25, '1.25x'],
          ]}
        />

        <fieldset>
          <legend className="text-[18px] font-semibold">Original text</legend>
          <label className="mt-3 flex min-h-[44px] items-center gap-3 text-[18px]">
            <input
              type="checkbox"
              checked={settings.alwaysOriginal}
              onChange={(e) => set('alwaysOriginal', e.target.checked)}
              className="h-6 w-6 accent-[var(--teal)]"
            />
            Always show the original text below the signing, not just on request
          </label>
        </fieldset>

        <Button variant="primary" onClick={onBack} className="self-start">
          Done
        </Button>
      </main>
    </div>
  )
}
