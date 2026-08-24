import { desc, eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { isCampaignAdmin } from '@/lib/campaign-payment'
import { db } from '@/lib/database'
import { campaign } from '@/lib/schema'
import { isStripePaymentsConfigured } from '@/lib/stripe'

export const getCampaigns = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const admin = isCampaignAdmin(session.user.email)
    const rows = await db.query.campaign.findMany({
      where: admin ? undefined : eq(campaign.status, 'funded'),
      orderBy: desc(campaign.createdAt),
      columns: {
        id: true,
        name: true,
        description: true,
        budgetAmount: true,
        currency: true,
        status: true,
        stripeCheckoutSessionId: true,
      },
    })
    return {
      campaigns: rows.map(({ stripeCheckoutSessionId, ...value }) => ({
        ...value,
        canContinuePayment: Boolean(stripeCheckoutSessionId),
      })),
      canCreate: admin && isStripePaymentsConfigured(),
    }
  },
)

export const getCampaignCreationAccess = createServerFn({
  method: 'GET',
}).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  return {
    available: Boolean(
      session &&
      isCampaignAdmin(session.user.email) &&
      isStripePaymentsConfigured(),
    ),
  }
})
