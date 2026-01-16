import { generateGeminiText, type GeminiConfig, type GeminiMessage } from '../services/gemini.js'
import { spendCredits, getCredits, type CreditAction } from '../services/credits.js'

export type AiMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiFile = {
  path: string
  content: string
}

export type AiRequestBody = {
  prompt?: string
  code?: string
  messages?: AiMessage[]
  userId?: string
  prefix?: string
  suffix?: string
  task?: string
  files?: AiFile[]
}

export type AiEnv = {
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
}

const SYSTEM_PROMPT =
  'You are an AI assistant for TakoMusic, a composition DSL. Be concise, deterministic, and return valid TakoMusic code when asked to compose.'

const AGENT_SYSTEM_PROMPT =
  'You are a coding agent for the TakoMusic repository. Apply the task by editing the provided files. Return only JSON in this shape: {"summary":"...","files":[{"path":"...","content":"..."}]}. Include only changed files, with full updated content. Preserve formatting where possible. Do not include markdown.'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const readJson = async (request: Request): Promise<AiRequestBody> => {
  try {
    return (await request.json()) as AiRequestBody
  } catch {
    return {}
  }
}

const resolveUserId = (request: Request, body: AiRequestBody): string =>
  body.userId ||
  request.headers.get('x-user-id') ||
  request.headers.get('x-user') ||
  'anonymous'

const buildConfig = (env?: AiEnv): GeminiConfig => ({
  apiKey: env?.GEMINI_API_KEY,
  model: env?.GEMINI_MODEL,
})

const toGeminiMessages = (messages: AiMessage[]): GeminiMessage[] =>
  messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }))

const ensureCredits = (userId: string, action: CreditAction) => {
  const result = spendCredits(userId, action)
  if (!result.ok) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Not enough credits', remainingCredits: result.remaining }, 402) }
  }
  return { ok: true, remaining: result.remaining, cost: result.cost }
}

const handleCompose = async (body: AiRequestBody, env?: AiEnv) => {
  const prompt = body.prompt?.trim()
  if (!prompt) {
    return jsonResponse({ ok: false, error: 'Prompt is required.' }, 400)
  }

  const messages: GeminiMessage[] = [
    {
      role: 'user',
      parts: [
        {
          text: `Compose a TakoMusic score based on this request:\n${prompt}\nReturn only TakoMusic code in a single fenced block.`,
        },
      ],
    },
  ]

  const text = await generateGeminiText({
    config: buildConfig(env),
    messages,
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.6,
    maxOutputTokens: 1200,
  })

  return text
}

const handleExplain = async (body: AiRequestBody, env?: AiEnv) => {
  const code = body.code?.trim()
  if (!code) {
    return jsonResponse({ ok: false, error: 'Code is required.' }, 400)
  }

  const extra = body.prompt?.trim()
  const prompt = `Explain this TakoMusic code${extra ? ` (${extra})` : ''}:\n\n${code}`
  const messages: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }]

  const text = await generateGeminiText({
    config: buildConfig(env),
    messages,
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.5,
    maxOutputTokens: 800,
  })

  return text
}

const handleChat = async (body: AiRequestBody, env?: AiEnv) => {
  const messages = body.messages?.filter((msg) => msg.content?.trim()) ?? []
  if (messages.length === 0) {
    return jsonResponse({ ok: false, error: 'Messages are required.' }, 400)
  }

  const text = await generateGeminiText({
    config: buildConfig(env),
    messages: toGeminiMessages(messages),
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.7,
    maxOutputTokens: 700,
  })

  return text
}

const handleInline = async (body: AiRequestBody, env?: AiEnv) => {
  const prefix = body.prefix?.trim()
  if (!prefix) {
    return jsonResponse({ ok: false, error: 'Prefix is required.' }, 400)
  }
  const suffix = body.suffix?.trim() ?? ''

  const prompt = `Complete the following TakoMusic code. Return only the continuation, no explanations.\n\nPREFIX:\n${prefix}\n\nSUFFIX:\n${suffix}`
  const messages: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }]

  const text = await generateGeminiText({
    config: buildConfig(env),
    messages,
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.4,
    maxOutputTokens: 300,
  })

  return text
}

const handleAgent = async (body: AiRequestBody, env?: AiEnv) => {
  const task = body.task?.trim()
  if (!task) {
    return jsonResponse({ ok: false, error: 'Task is required.' }, 400)
  }

  const files = body.files?.filter((file) => file.path && typeof file.content === 'string') ?? []
  if (files.length === 0) {
    return jsonResponse({ ok: false, error: 'Files are required.' }, 400)
  }

  const fileContext = files
    .map((file) => `--- ${file.path}\n${file.content}\n`)
    .join('\n')
  const prompt = `Task:\n${task}\n\nFiles:\n${fileContext}\nReturn JSON only.`
  const messages: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }]

  const text = await generateGeminiText({
    config: buildConfig(env),
    messages,
    systemInstruction: AGENT_SYSTEM_PROMPT,
    temperature: 0.2,
    maxOutputTokens: 1800,
  })

  return text
}

export const handleAiRequest = async (request: Request, env?: AiEnv): Promise<Response> => {
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  const url = new URL(request.url)
  const body = await readJson(request)
  const userId = resolveUserId(request, body)

  let action: CreditAction | null = null
  let handler: ((body: AiRequestBody, env?: AiEnv) => Promise<string | Response>) | null = null

  switch (url.pathname) {
    case '/api/ai/compose':
      action = 'compose'
      handler = handleCompose
      break
    case '/api/ai/explain':
      action = 'explain'
      handler = handleExplain
      break
    case '/api/ai/chat':
      action = 'chat'
      handler = handleChat
      break
    case '/api/ai/inline':
      action = 'inline'
      handler = handleInline
      break
    case '/api/ai/agent':
      action = 'agent'
      handler = handleAgent
      break
    default:
      return jsonResponse({ ok: false, error: 'Not found' }, 404)
  }

  const creditCheck = ensureCredits(userId, action)
  if (!creditCheck.ok) {
    return creditCheck.response
  }

  const result = await handler(body, env)
  if (result instanceof Response) {
    return result
  }

  return jsonResponse({
    ok: true,
    text: result,
    remainingCredits: creditCheck.remaining,
    creditsUsed: creditCheck.cost,
    totalCredits: getCredits(userId),
  })
}
