import { For, createSignal } from 'solid-js'
import { useI18n } from '../i18n'
import type { Language } from '../i18n/translations'

export function LanguageSwitcher() {
  const { locale, setLocale, languages } = useI18n()
  const [status, setStatus] = createSignal('')

  const flashStatus = (message: string) => {
    setStatus(message)
    window.setTimeout(() => setStatus(''), 2000)
  }

  const handleLocaleChange = async (code: Language) => {
    const ok = await setLocale(code)
    if (!ok) {
      flashStatus('Language save failed. IndexedDB unavailable.')
    }
  }

  return (
    <div class="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
      <For each={languages}>
        {(lang) => (
          <button
            onClick={() => void handleLocaleChange(lang.code)}
            class={`px-3 py-1 rounded text-sm transition-colors ${
              locale() === lang.code
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang.code.toUpperCase()}
          </button>
        )}
      </For>
      {status() ? <span class="text-xs text-slate-400">{status()}</span> : null}
    </div>
  )
}
