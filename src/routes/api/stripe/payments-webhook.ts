import { createFileRoute } from '@tanstack/react-router'

import { fundCampaignFromCheckoutSession } from '@/lib/campaign-payment'
import { env } from '@/lib/env'
import { getStripe } from '@/lib/stripe'

export const Route = createFileRoute('/api/stripe/payments-webhook')({
  server: { handlers: { POST: handleStripePaymentsWebhook } },
})

async function handleStripePaymentsWebhook({ request }: { request: Request }) {
  const signature = request.headers.get('stripe-signature')
  if (!signature || !env.STRIPE_PAYMENTS_WEBHOOK_SECRET) {
    return new Response('Missing Stripe signature', { status: 400 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      env.STRIPE_PAYMENTS_WEBHOOK_SECRET,
    )
  } catch {
    return new Response('Invalid Stripe signature', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    if (!event.data.object.metadata?.campaignId) {
      return Response.json({ received: true })
    }
    await fundCampaignFromCheckoutSession(event.data.object)
  }

  return Response.json({ received: true })
}
