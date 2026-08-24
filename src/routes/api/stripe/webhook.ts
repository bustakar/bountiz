import { and, eq, isNull, lte, or } from 'drizzle-orm'
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

  const processingToken = crypto.randomUUID()
  const now = new Date()
  const processingExpiresAt = new Date(now.getTime() + 5 * 60 * 1000)
  const claimed = await db
    .insert(stripeWebhookEvent)
    .values({
      id: event.id,
      type: event.type,
      processingToken,
      processingExpiresAt,
    })
    .onConflictDoUpdate({
      target: stripeWebhookEvent.id,
      set: { processingToken, processingExpiresAt },
      setWhere: and(
        isNull(stripeWebhookEvent.processedAt),
        or(
          isNull(stripeWebhookEvent.processingExpiresAt),
          lte(stripeWebhookEvent.processingExpiresAt, now),
        ),
      ),
    })
    .returning({ id: stripeWebhookEvent.id })
  if (claimed.length === 0) {
    const existing = await db.query.stripeWebhookEvent.findFirst({
      where: eq(stripeWebhookEvent.id, event.id),
    })
    if (existing?.processedAt) return Response.json({ received: true })
    return new Response('Webhook processing in progress', { status: 409 })
  }

  try {
    if (event.type === 'account.updated') {
      await refreshStripeAccount(
        eq(stripeConnectedAccount.stripeAccountId, event.data.object.id),
      )
    }
  } catch (error) {
    await db
      .delete(stripeWebhookEvent)
      .where(
        and(
          eq(stripeWebhookEvent.id, event.id),
          eq(stripeWebhookEvent.processingToken, processingToken),
        ),
      )
    throw error
  }

  await db
    .update(stripeWebhookEvent)
    .set({ processedAt: new Date() })
    .where(
      and(
        eq(stripeWebhookEvent.id, event.id),
        eq(stripeWebhookEvent.processingToken, processingToken),
      ),
    )

  return Response.json({ received: true })
}
