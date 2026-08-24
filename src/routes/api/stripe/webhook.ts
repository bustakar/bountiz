import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'

import { db } from '@/lib/database'
import { env } from '@/lib/env'
import { stripeConnectedAccount, stripeWebhookEvent } from '@/lib/schema'
import { refreshStripeAccount } from '@/lib/stripe-account'
import { getStripe } from '@/lib/stripe'

export const Route = createFileRoute('/api/stripe/webhook')({
  server: { handlers: { POST: handleStripeWebhook } },
})

async function handleStripeWebhook({ request }: { request: Request }) {
  const signature = request.headers.get('stripe-signature')
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Missing Stripe signature', { status: 400 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return new Response('Invalid Stripe signature', { status: 400 })
  }

  const inserted = await db
    .insert(stripeWebhookEvent)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeWebhookEvent.id })
  if (inserted.length === 0) return Response.json({ received: true })

  try {
    if (event.type === 'account.updated') {
      await refreshStripeAccount(
        eq(stripeConnectedAccount.stripeAccountId, event.data.object.id),
      )
    }
  } catch (error) {
    await db
      .delete(stripeWebhookEvent)
      .where(eq(stripeWebhookEvent.id, event.id))
    throw error
  }

  return Response.json({ received: true })
}
