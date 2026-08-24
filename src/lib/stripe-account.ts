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

  const persisted = await db
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
    .returning({ userId: stripeConnectedAccount.userId })

  if (persisted.length === 0) {
    const winner = await db.query.stripeConnectedAccount.findFirst({
      where: eq(
        stripeConnectedAccount.stripeAccountId,
        connection.stripeAccountId,
      ),
    })
    if (!winner) return null

    return {
      account,
      snapshot: {
        detailsSubmitted: winner.detailsSubmitted,
        payoutsEnabled: winner.payoutsEnabled,
        transfersStatus: winner.transfersStatus,
        requirementsDue: winner.requirementsDue,
        disabledReason: winner.disabledReason,
      },
    }
  }

  return { account, snapshot }
}
