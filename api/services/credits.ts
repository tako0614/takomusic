export type CreditAction = 'compose' | 'explain' | 'chat' | 'inline' | 'agent'

export const CREDIT_COSTS: Record<CreditAction, number> = {
  compose: 5,
  explain: 3,
  chat: 1,
  inline: 1,
  agent: 8,
}

const DEFAULT_CREDITS = 50
const creditLedger = new Map<string, number>()

export const getCredits = (userId: string): number => {
  if (!creditLedger.has(userId)) {
    creditLedger.set(userId, DEFAULT_CREDITS)
  }
  return creditLedger.get(userId) ?? DEFAULT_CREDITS
}

export const setCredits = (userId: string, amount: number): number => {
  const next = Math.max(0, Math.floor(amount))
  creditLedger.set(userId, next)
  return next
}

export const spendCredits = (userId: string, action: CreditAction) => {
  const cost = CREDIT_COSTS[action] ?? 1
  const current = getCredits(userId)
  if (current < cost) {
    return { ok: false, remaining: current, cost }
  }
  const remaining = current - cost
  creditLedger.set(userId, remaining)
  return { ok: true, remaining, cost }
}
