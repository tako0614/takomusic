import { createSignal } from 'solid-js'
import { readSetting, writeSetting } from './db'

const STORAGE_KEY = 'user'
let mutationId = 0

const [user, setUser] = createSignal<string | null>(null)

const hydrateUser = async () => {
  const snapshot = mutationId
  const stored = await readSetting(STORAGE_KEY)
  if (snapshot !== mutationId) return
  const trimmed = stored?.trim()
  if (trimmed) {
    setUser(trimmed)
  }
}

void hydrateUser()

export const signIn = async (name: string): Promise<boolean> => {
  const trimmed = name.trim()
  if (!trimmed) return false
  const stored = await writeSetting(STORAGE_KEY, trimmed)
  if (!stored) {
    return false
  }
  mutationId += 1
  setUser(trimmed)
  return true
}

export const signOut = async (): Promise<boolean> => {
  const stored = await writeSetting(STORAGE_KEY, null)
  if (!stored) {
    return false
  }
  mutationId += 1
  setUser(null)
  return true
}

export { user }
