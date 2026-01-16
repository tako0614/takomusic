import { createSignal } from 'solid-js'

const STORAGE_KEY = 'takomusic.user'

const readUser = (): string | null => {
  if (typeof localStorage === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  const trimmed = stored.trim()
  return trimmed.length > 0 ? trimmed : null
}

const [user, setUser] = createSignal<string | null>(readUser())

const persistUser = (name: string | null) => {
  if (typeof localStorage === 'undefined') return
  if (!name) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, name)
}

export const signIn = (name: string): boolean => {
  const trimmed = name.trim()
  if (!trimmed) return false
  setUser(trimmed)
  persistUser(trimmed)
  return true
}

export const signOut = () => {
  setUser(null)
  persistUser(null)
}

export { user }
