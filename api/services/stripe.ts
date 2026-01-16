import crypto from 'node:crypto'

export type CheckoutRequest = {
  secretKey: string
  priceId: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
  metadata?: Record<string, string>
}

export type CheckoutResponse = {
  id: string
  url: string
}

export type StripeWebhookResult = {
  ok: boolean
  event?: { type: string; data?: { object?: any } }
  error?: string
}

export const createCheckoutSession = async (request: CheckoutRequest): Promise<CheckoutResponse> => {
  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('line_items[0][price]', request.priceId)
  params.set('line_items[0][quantity]', '1')
  params.set('success_url', request.successUrl)
  params.set('cancel_url', request.cancelUrl)
  if (request.customerEmail) {
    params.set('customer_email', request.customerEmail)
  }
  if (request.metadata) {
    for (const [key, value] of Object.entries(request.metadata)) {
      params.set(`metadata[${key}]`, value)
    }
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${request.secretKey}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Stripe checkout failed (${response.status}): ${detail}`)
  }

  const payload = (await response.json()) as { id: string; url: string }
  return { id: payload.id, url: payload.url }
}

const parseSignature = (header: string) => {
  const parts = header.split(',')
  const timestampPart = parts.find((part) => part.startsWith('t='))
  const signaturePart = parts.find((part) => part.startsWith('v1='))
  if (!timestampPart || !signaturePart) return null
  return {
    timestamp: timestampPart.slice(2),
    signature: signaturePart.slice(3),
  }
}

export const verifyStripeSignature = (payload: string, header: string, secret: string): boolean => {
  const parsed = parseSignature(header)
  if (!parsed) return false
  const signedPayload = `${parsed.timestamp}.${payload}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parsed.signature))
}

export const parseStripeWebhook = (payload: string, signature: string | null, secret: string): StripeWebhookResult => {
  if (!signature) {
    return { ok: false, error: 'Missing Stripe signature' }
  }
  if (!verifyStripeSignature(payload, signature, secret)) {
    return { ok: false, error: 'Invalid Stripe signature' }
  }
  try {
    const event = JSON.parse(payload) as { type: string; data?: { object?: any } }
    return { ok: true, event }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid JSON' }
  }
}
