import { and, eq, isNull, lte, or } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { db } from '@/lib/database'
import { stripeConnectedAccount } from '@/lib/schema'
import { getStripe, getStripeAccountSnapshot } from '@/lib/stripe'

export async function refreshStripeAccount(where: SQL) {
  for (;;) {
    const refreshToken = crypto.randomUUID()
    const now = new Date()
    const connection = (
      await db
        .update(stripeConnectedAccount)
        .set({
          refreshToken,
          refreshExpiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        })
        .where(
          and(
            where,
            or(
              isNull(stripeConnectedAccount.refreshToken),
              lte(stripeConnectedAccount.refreshExpiresAt, now),
            ),
          ),
        )
        .returning({
          stripeAccountId: stripeConnectedAccount.stripeAccountId,
        })
    ).at(0)

    if (!connection) {
      const result = await waitForActiveRefresh(where)
      if (result !== 'expired') return result
      continue
    }

    try {
      const account = await getStripe().accounts.retrieve(
        connection.stripeAccountId,
      )
      const snapshot = getStripeAccountSnapshot(account)
      const persisted = await db
        .update(stripeConnectedAccount)
        .set({ ...snapshot, refreshToken: null, refreshExpiresAt: null })
        .where(
          and(
            eq(
              stripeConnectedAccount.stripeAccountId,
              connection.stripeAccountId,
            ),
            eq(stripeConnectedAccount.refreshToken, refreshToken),
          ),
        )
        .returning({ userId: stripeConnectedAccount.userId })

      if (persisted.length > 0) {
        return { stripeAccountId: connection.stripeAccountId, snapshot }
      }
    } catch (error) {
      await db
        .update(stripeConnectedAccount)
        .set({ refreshExpiresAt: new Date(0) })
        .where(eq(stripeConnectedAccount.refreshToken, refreshToken))
      throw error
    }
  }
}

async function waitForActiveRefresh(where: SQL) {
  for (;;) {
    const connection = (
      await db
        .select({
          stripeAccountId: stripeConnectedAccount.stripeAccountId,
          detailsSubmitted: stripeConnectedAccount.detailsSubmitted,
          payoutsEnabled: stripeConnectedAccount.payoutsEnabled,
          transfersStatus: stripeConnectedAccount.transfersStatus,
          requirementsDue: stripeConnectedAccount.requirementsDue,
          disabledReason: stripeConnectedAccount.disabledReason,
          refreshToken: stripeConnectedAccount.refreshToken,
          refreshExpiresAt: stripeConnectedAccount.refreshExpiresAt,
        })
        .from(stripeConnectedAccount)
        .where(where)
        .limit(1)
    ).at(0)

    if (!connection) return null
    if (!connection.refreshToken) {
      return {
        stripeAccountId: connection.stripeAccountId,
        snapshot: {
          detailsSubmitted: connection.detailsSubmitted,
          payoutsEnabled: connection.payoutsEnabled,
          transfersStatus: connection.transfersStatus,
          requirementsDue: connection.requirementsDue,
          disabledReason: connection.disabledReason,
        },
      }
    }
    if (
      connection.refreshExpiresAt &&
      connection.refreshExpiresAt <= new Date()
    ) {
      return 'expired' as const
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
