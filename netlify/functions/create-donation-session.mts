const MINIMUM_DONATION_CENTS = 500
const MAXIMUM_DONATION_CENTS = 1_000_000

const jsonResponse = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  const stripeSecretKey = Netlify.env.get('STRIPE_SECRET_KEY')

  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not configured.')
    return jsonResponse({ error: 'Donations are temporarily unavailable.' }, 503)
  }

  let payload

  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid request.' }, 400)
  }

  const amount = Number(payload.amount)
  const amountInCents = Math.round(amount * 100)

  if (
    !Number.isFinite(amount) ||
    amountInCents < MINIMUM_DONATION_CENTS ||
    amountInCents > MAXIMUM_DONATION_CENTS
  ) {
    return jsonResponse({ error: 'Choose an amount between $5 and $10,000.' }, 400)
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : ''

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Enter a valid email address.' }, 400)
  }

  const siteOrigin = new URL(request.url).origin
  const checkoutParams = new URLSearchParams({
    mode: 'payment',
    submit_type: 'donate',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': 'The Blessing Fund Donation',
    'line_items[0][price_data][product_data][description]':
      'Supports delivery services for low-income seniors in Central Iowa.',
    'line_items[0][price_data][unit_amount]': String(amountInCents),
    'line_items[0][quantity]': '1',
    'payment_intent_data[metadata][fund]': 'blessing_fund',
    success_url: `${siteOrigin}/?donation=success&session_id={CHECKOUT_SESSION_ID}#blessing-fund`,
    cancel_url: `${siteOrigin}/?donation=cancelled#blessing-fund`,
  })

  if (email) {
    checkoutParams.set('customer_email', email)
  }

  try {
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: checkoutParams,
    })

    const checkoutSession = await stripeResponse.json()

    if (!stripeResponse.ok || !checkoutSession.url) {
      console.error('Stripe Checkout session creation failed.', {
        status: stripeResponse.status,
        type: checkoutSession?.error?.type,
        code: checkoutSession?.error?.code,
      })
      return jsonResponse({ error: 'Unable to start secure checkout.' }, 502)
    }

    return jsonResponse({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe Checkout request failed.', error)
    return jsonResponse({ error: 'Unable to start secure checkout.' }, 502)
  }
}

export const config = {
  path: '/api/create-donation-session',
}
