import { handleAiRequest, type AiEnv } from './routes/ai.js'
import { handleExportRequest } from './routes/exports.js'
import { handleBillingRequest, type BillingEnv } from './routes/billing.js'
import { handleSyncRequest } from './routes/sync.js'

const notFound = () =>
  new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain' },
  })

export default {
  async fetch(request: Request, env: AiEnv & BillingEnv): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/ai/')) {
      return handleAiRequest(request, env)
    }
    if (url.pathname.startsWith('/api/exports')) {
      return handleExportRequest(request)
    }
    if (url.pathname.startsWith('/api/billing')) {
      return handleBillingRequest(request, env)
    }
    if (url.pathname.startsWith('/api/sync')) {
      return handleSyncRequest(request)
    }
    return notFound()
  },
}
