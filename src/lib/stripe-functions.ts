import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/database'
import { stripeConnectedAccount } from '@/lib/schema'
import {
  getStripe,
  getStripeAccountSnapshot,
  getStripePayoutStatus,
  isStripeConfigured,
} from '@/lib/stripe'

export const getStripeConnection = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const connection = await db.query.stripeConnectedAccount.findFirst({
      where: eq(stripeConnectedAccount.userId, session.user.id),
    })
    const available = isStripeConfigured()
    if (!connection) return { available, connection: null }

    let snapshot = {
      detailsSubmitted: connection.detailsSubmitted,
      payoutsEnabled: connection.payoutsEnabled,
      transfersStatus: connection.transfersStatus,
      requirementsDue: connection.requirementsDue,
      disabledReason: connection.disabledReason,
    }

    if (available) {
      try {
        const account = await getStripe().accounts.retrieve(
          connection.stripeAccountId,
        )
        snapshot = getStripeAccountSnapshot(account)
        await db
          .update(stripeConnectedAccount)
          .set(snapshot)
          .where(eq(stripeConnectedAccount.userId, session.user.id))
      } catch {
        return {
          available,
          connection: { status: 'unavailable' as const },
        }
      }
    }

    return {
      available,
      connection: { status: getStripePayoutStatus(snapshot) },
    }
  },
)
