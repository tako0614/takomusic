export type AiAction = 'compose' | 'explain' | 'chat' | 'inline' | 'agent'

export type AiFile = {
  path: string
  content: string
}

export type AiMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiResponse = {
  ok: boolean
  text?: string
  error?: string
  remainingCredits?: number
  creditsUsed?: number
}

export const AI_CREDIT_COSTS: Record<AiAction, number> = {
  compose: 5,
  explain: 3,
  chat: 1,
  inline: 1,
  agent: 8,
}

const baseEndpoint = (): string => {
  const raw = (import.meta as any).env?.VITE_TAKOMUSIC_AI_URL || '/api/ai'
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

const postJson = async (path: string, payload: Record<string, unknown>): Promise<AiResponse> => {
  const response = await fetch(`${baseEndpoint()}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as AiResponse
  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || `Request failed (${response.status})`,
      remainingCredits: data?.remainingCredits,
    }
  }
  return data
}

export const extractCodeBlock = (text: string): string => {
  const match = text.match(/```(?:mf|takomusic)?\s*([\s\S]*?)```/i)
  if (match?.[1]) return match[1].trim()
  return text.trim()
}

export const composeAi = async (prompt: string, userId?: string): Promise<AiResponse> =>
  postJson('/compose', { prompt, userId })

export const explainAi = async (code: string, prompt?: string, userId?: string): Promise<AiResponse> =>
  postJson('/explain', { code, prompt, userId })

export const chatAi = async (messages: AiMessage[], userId?: string): Promise<AiResponse> =>
  postJson('/chat', { messages, userId })

export const inlineAi = async (prefix: string, suffix: string, userId?: string): Promise<AiResponse> =>
  postJson('/inline', { prefix, suffix, userId })

export const agentAi = async (task: string, files: AiFile[], userId?: string): Promise<AiResponse> =>
  postJson('/agent', { task, files, userId })
