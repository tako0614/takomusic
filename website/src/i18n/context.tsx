import { createContext, useContext, createSignal, createEffect, createMemo } from 'solid-js'
import type { ParentComponent, Accessor } from 'solid-js'
import { translations } from './translations'
import type { Language } from './translations'
import { readSetting, writeSetting } from '../stores/db'

// Use a structural type that works for both languages
type Translations = typeof translations[Language]

type I18nContextType = {
  t: Accessor<Translations>
  locale: Accessor<Language>
  setLocale: (lang: Language) => Promise<boolean>
  languages: { code: Language; name: string }[]
}

const I18nContext = createContext<I18nContextType>()

const STORAGE_KEY = 'lang'
let mutationId = 0

function getBrowserLocale(): Language {
  if (typeof window !== 'undefined') {
    const browserLang = navigator.language.split('-')[0]
    if (browserLang === 'ja') {
      return 'ja'
    }
  }
  return 'en'
}

export const I18nProvider: ParentComponent = (props) => {
  const [locale, setLocaleSignal] = createSignal<Language>(getBrowserLocale())

  const hydrateLocale = async () => {
    const snapshot = mutationId
    const stored = await readSetting(STORAGE_KEY)
    if (snapshot !== mutationId) return
    if (stored === 'ja' || stored === 'en') {
      setLocaleSignal(stored)
    }
  }

  void hydrateLocale()

  const setLocale = async (lang: Language) => {
    const stored = await writeSetting(STORAGE_KEY, lang)
    if (!stored) {
      return false
    }
    mutationId += 1
    setLocaleSignal(lang)
    if (typeof window !== 'undefined') {
      document.documentElement.lang = lang
    }
    return true
  }

  // Set initial html lang attribute
  createEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = locale()
    }
  })

  // Create a memo for translations that updates when locale changes
  const t = createMemo(() => translations[locale()])

  const value: I18nContextType = {
    t,
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
