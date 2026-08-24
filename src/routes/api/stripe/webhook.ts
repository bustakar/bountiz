import { and, eq, isNull, lte, or } from 'drizzle-orm'
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

  const connection =
    event.type === 'account.updated'
      ? await db.query.stripeConnectedAccount.findFirst({
          columns: { stripeAccountId: true },
          where: eq(
            stripeConnectedAccount.stripeAccountId,
            event.data.object.id,
          ),
        })
      : undefined
  const account = connection
    ? await getStripe().accounts.retrieve(connection.stripeAccountId)
    : undefined

  await db.transaction(async (transaction) => {
    const inserted = await transaction
      .insert(stripeWebhookEvent)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ id: stripeWebhookEvent.id })
    if (inserted.length === 0) return

    if (account) {
      await transaction
        .update(stripeConnectedAccount)
        .set({
          ...getStripeAccountSnapshot(account),
          lastWebhookCreatedAt: event.created,
        })
        .where(
          and(
            eq(stripeConnectedAccount.stripeAccountId, account.id),
            or(
              isNull(stripeConnectedAccount.lastWebhookCreatedAt),
              lte(stripeConnectedAccount.lastWebhookCreatedAt, event.created),
            ),
          ),
        )
    }
  })

  return Response.json({ received: true })
}
