import { pullFiles, pushFiles, type CloudFile } from '../services/cloudSync.js'

type SyncBody = {
  userId?: string
  files?: CloudFile[]
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const readJson = async (request: Request): Promise<SyncBody> => {
  try {
    return (await request.json()) as SyncBody
  } catch {
    return {}
  }
}

const resolveUserId = (request: Request, body?: SyncBody): string =>
  body?.userId || request.headers.get('x-user-id') || request.headers.get('x-user') || 'anonymous'

export const handleSyncRequest = async (request: Request): Promise<Response> => {
  const url = new URL(request.url)

  if (request.method === 'POST' && url.pathname === '/api/sync/push') {
    const body = await readJson(request)
    const userId = resolveUserId(request, body)
    const files = Array.isArray(body.files) ? body.files : []
    const stored = pushFiles(userId, files)
    return jsonResponse({ ok: true, count: stored.length })
  }

  if (request.method === 'GET' && url.pathname === '/api/sync/pull') {
    const userId = resolveUserId(request)
    const files = pullFiles(userId)
    return jsonResponse({ ok: true, files })
  }

  return jsonResponse({ ok: false, error: 'Not found' }, 404)
}
