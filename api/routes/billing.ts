import { createCheckoutSession, parseStripeWebhook } from '../services/stripe.js'
import { setCredits } from '../services/credits.js'

export type BillingEnv = {
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_ID?: string
}

type CheckoutBody = {
  priceId?: string
  successUrl?: string
  cancelUrl?: string
  email?: string
  userId?: string
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const readJson = async (request: Request): Promise<CheckoutBody> => {
  try {
    return (await request.json()) as CheckoutBody
  } catch {
    return {}
  }
}

export const handleBillingRequest = async (request: Request, env?: BillingEnv): Promise<Response> => {
  const url = new URL(request.url)

  if (request.method === 'POST' && url.pathname === '/api/billing/checkout') {
    const body = await readJson(request)
    const secretKey = env?.STRIPE_SECRET_KEY
    if (!secretKey) {
      return jsonResponse({ ok: false, error: 'Stripe secret key not configured' }, 500)
    }
    const priceId = body.priceId ?? env?.STRIPE_PRICE_ID
    if (!priceId || !body.successUrl || !body.cancelUrl) {
      return jsonResponse({ ok: false, error: 'priceId, successUrl, cancelUrl required' }, 400)
    }
    try {
      const session = await createCheckoutSession({
        secretKey,
        priceId,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
        customerEmail: body.email,
        metadata: body.userId ? { userId: body.userId } : undefined,
      })
      return jsonResponse({ ok: true, sessionId: session.id, url: session.url })
    } catch (err) {
      return jsonResponse({ ok: false, error: err instanceof Error ? err.message : 'Stripe error' }, 500)
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/billing/webhook') {
    const secret = env?.STRIPE_WEBHOOK_SECRET
    if (!secret) {
      return jsonResponse({ ok: false, error: 'Webhook secret not configured' }, 500)
    }
    const payload = await request.text()
    const signature = request.headers.get('stripe-signature')
    const result = parseStripeWebhook(payload, signature, secret)
    if (!result.ok || !result.event) {
      return jsonResponse({ ok: false, error: result.error || 'Invalid webhook' }, 400)
    }

    const event = result.event
    if (event.type === 'checkout.session.completed') {
      const userId = event.data?.object?.metadata?.userId
      if (userId) {
        setCredits(userId, 1000)
      }
    }

    return jsonResponse({ ok: true })
  }

  return jsonResponse({ ok: false, error: 'Not found' }, 404)
}
