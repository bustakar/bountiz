import { and, eq, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { db } from '@/lib/database'
import { stripeConnectedAccount } from '@/lib/schema'
import { getStripe, getStripeAccountSnapshot } from '@/lib/stripe'

export async function refreshStripeAccount(where: SQL) {
  // Only the most recently started refresh may persist its Stripe snapshot.
  const connection = (
    await db
      .update(stripeConnectedAccount)
      .set({
        webhookSyncVersion: sql`${stripeConnectedAccount.webhookSyncVersion} + 1`,
      })
      .where(where)
      .returning({
        stripeAccountId: stripeConnectedAccount.stripeAccountId,
        webhookSyncVersion: stripeConnectedAccount.webhookSyncVersion,
      })
  ).at(0)
  if (!connection) return null

  const account = await getStripe().accounts.retrieve(
    connection.stripeAccountId,
  )
  const snapshot = getStripeAccountSnapshot(account)

  await db
    .update(stripeConnectedAccount)
    .set(snapshot)
    .where(
      and(
        eq(stripeConnectedAccount.stripeAccountId, connection.stripeAccountId),
        eq(
          stripeConnectedAccount.webhookSyncVersion,
          connection.webhookSyncVersion,
        ),
      ),
    )

  return snapshot
}
