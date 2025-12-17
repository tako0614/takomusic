import { createContext, useContext, createSignal, createEffect } from 'solid-js'
import type { ParentComponent } from 'solid-js'
import { translations } from './translations'
import type { Language } from './translations'

// Use a structural type that works for both languages
type Translations = typeof translations[Language]

type I18nContextType = {
  t: Translations
  locale: () => Language
  setLocale: (lang: Language) => void
  languages: { code: Language; name: string }[]
}

const I18nContext = createContext<I18nContextType>()

const STORAGE_KEY = 'takomusic-lang'

function getInitialLocale(): Language {
  // Check localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'ja' || stored === 'en') {
      return stored
    }
    // Check browser language
    const browserLang = navigator.language.split('-')[0]
    if (browserLang === 'ja') {
      return 'ja'
    }
  }
  return 'en'
}

export const I18nProvider: ParentComponent = (props) => {
  const [locale, setLocaleSignal] = createSignal<Language>(getInitialLocale())

  const setLocale = (lang: Language) => {
    setLocaleSignal(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang)
      document.documentElement.lang = lang
    }
  }

  // Set initial html lang attribute
  createEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = locale()
    }
  })

  const value: I18nContextType = {
    get t() {
      return translations[locale()]
    },
    locale,
    setLocale,
    languages: [
      { code: 'ja', name: '日本語' },
      { code: 'en', name: 'English' },
    ],
  }

  return (
    <I18nContext.Provider value={value}>
      {props.children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
