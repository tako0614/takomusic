import { handleExportRequest } from './routes/exports.js'

const notFound = () =>
  new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain' },
  })

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/exports')) {
      return handleExportRequest(request)
    }
    return notFound()
  },
}
