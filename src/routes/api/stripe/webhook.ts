import { and, eq, sql } from 'drizzle-orm'
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

  // Only the most recently started refresh may persist its Stripe snapshot.
  const connection =
    event.type === 'account.updated'
      ? (
          await db
            .update(stripeConnectedAccount)
            .set({
              webhookSyncVersion: sql`${stripeConnectedAccount.webhookSyncVersion} + 1`,
            })
            .where(
              eq(stripeConnectedAccount.stripeAccountId, event.data.object.id),
            )
            .returning({
              stripeAccountId: stripeConnectedAccount.stripeAccountId,
              webhookSyncVersion: stripeConnectedAccount.webhookSyncVersion,
            })
        ).at(0)
      : undefined
  const account = connection
    ? await getStripe().accounts.retrieve(connection.stripeAccountId)
    : undefined

  await db.transaction(async (transaction) => {
    await transaction
      .insert(stripeWebhookEvent)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()

    if (account && connection) {
      await transaction
        .update(stripeConnectedAccount)
        .set(getStripeAccountSnapshot(account))
        .where(
          and(
            eq(stripeConnectedAccount.stripeAccountId, account.id),
            eq(
              stripeConnectedAccount.webhookSyncVersion,
              connection.webhookSyncVersion,
            ),
          ),
        )
    }
  })

  return Response.json({ received: true })
}
