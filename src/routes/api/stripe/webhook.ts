import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'

import { db } from '@/lib/database'
import { env } from '@/lib/env'
import { stripeConnectedAccount, stripeWebhookEvent } from '@/lib/schema'
import { getStripe, getStripeAccountSnapshot } from '@/lib/stripe'

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

  await db.transaction(async (transaction) => {
    const inserted = await transaction
      .insert(stripeWebhookEvent)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ id: stripeWebhookEvent.id })
    if (inserted.length === 0) return

    if (event.type === 'account.updated') {
      const connection = (
        await transaction
          .select({ stripeAccountId: stripeConnectedAccount.stripeAccountId })
          .from(stripeConnectedAccount)
          .where(
            eq(stripeConnectedAccount.stripeAccountId, event.data.object.id),
          )
          .for('update')
      ).at(0)
      if (!connection) return

      const account = await getStripe().accounts.retrieve(
        connection.stripeAccountId,
      )
      await transaction
        .update(stripeConnectedAccount)
        .set(getStripeAccountSnapshot(account))
        .where(
          eq(
            stripeConnectedAccount.stripeAccountId,
            connection.stripeAccountId,
          ),
        )
    }
  })

  return Response.json({ received: true })
}
