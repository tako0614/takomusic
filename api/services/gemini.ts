export type GeminiConfig = {
  apiKey?: string
  model?: string
  endpoint?: string
}

export type GeminiMessage = {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

export type GeminiOptions = {
  config?: GeminiConfig
  messages: GeminiMessage[]
  systemInstruction?: string
  temperature?: number
  maxOutputTokens?: number
}

const DEFAULT_MODEL = 'gemini-2.0-flash'

const resolveConfig = (config?: GeminiConfig): Required<GeminiConfig> => {
  const apiKey =
    config?.apiKey ??
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) ??
    ''
  const model =
    config?.model ??
    (typeof process !== 'undefined' ? process.env.GEMINI_MODEL : undefined) ??
    DEFAULT_MODEL
  const endpoint =
    config?.endpoint ??
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  return { apiKey, model, endpoint }
}

const readCandidateText = (payload: any): string => {
  const parts = payload?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts.map((part: { text?: string }) => part.text ?? '').join('')
}

export const generateGeminiText = async (options: GeminiOptions): Promise<string> => {
  const config = resolveConfig(options.config)
  if (!config.apiKey) {
    throw new Error('Gemini API key is missing')
  }

  const body: Record<string, unknown> = {
    contents: options.messages,
    generationConfig: {
      temperature: options.temperature ?? 0.6,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
    },
  }

  if (options.systemInstruction) {
    body.systemInstruction = {
      role: 'system',
      parts: [{ text: options.systemInstruction }],
    }
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Gemini request failed (${response.status}): ${detail}`)
  }

  const payload = await response.json()
  return readCandidateText(payload).trim()
}
