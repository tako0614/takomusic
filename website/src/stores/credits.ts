import { createEffect, createSignal } from 'solid-js'
import { user } from './session'
import { AI_CREDIT_COSTS, type AiAction } from '../lib/aiClient'

const STORAGE_PREFIX = 'takomusic.credits'
const DEFAULT_CREDITS = 50

const storageKeyFor = (username: string) => `${STORAGE_PREFIX}.${username}`

const loadCreditsFor = (username: string): number => {
  if (typeof localStorage === 'undefined') return DEFAULT_CREDITS
  const raw = localStorage.getItem(storageKeyFor(username))
  if (!raw) return DEFAULT_CREDITS
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) ? Math.max(0, value) : DEFAULT_CREDITS
}

const persistCredits = (username: string, value: number) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(storageKeyFor(username), String(value))
}

const [credits, setCredits] = createSignal(DEFAULT_CREDITS)

createEffect(() => {
  const currentUser = user()
  if (!currentUser) {
    setCredits(DEFAULT_CREDITS)
    return
  }
  setCredits(loadCreditsFor(currentUser))
})

export const getCreditCost = (action: AiAction): number => AI_CREDIT_COSTS[action] ?? 1

export const canAfford = (action: AiAction): boolean => credits() >= getCreditCost(action)

export const applyCreditSpend = (action: AiAction): number => {
  const currentUser = user()
  const cost = getCreditCost(action)
  const next = Math.max(0, credits() - cost)
  setCredits(next)
  if (currentUser) {
    persistCredits(currentUser, next)
  }
  return next
}

export const syncCredits = (remaining: number) => {
  const currentUser = user()
  const next = Math.max(0, Math.floor(remaining))
  setCredits(next)
  if (currentUser) {
    persistCredits(currentUser, next)
  }
}

export { credits }
