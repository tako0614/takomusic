import { For } from 'solid-js'
import { useI18n } from '../i18n'

export function LanguageSwitcher() {
  const { locale, setLocale, languages } = useI18n()

  return (
    <div class="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
      <For each={languages}>
        {(lang) => (
          <button
            onClick={() => setLocale(lang.code)}
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
    </div>
  )
}
