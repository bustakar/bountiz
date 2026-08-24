import { and, eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'

import { auth } from '@/lib/auth'
import {
  continueCampaignCheckout as continuePendingCampaignCheckout,
  isCampaignAdmin,
} from '@/lib/campaign-payment'
import { db } from '@/lib/database'
import { env } from '@/lib/env'
import { campaign } from '@/lib/schema'
import { isStripePaymentsConfigured } from '@/lib/stripe'

export const Route = createFileRoute('/api/campaigns/checkout')({
  server: { handlers: { POST: continueCampaignCheckout } },
})

async function continueCampaignCheckout({ request }: { request: Request }) {
  if (request.headers.get('origin') !== new URL(env.APP_URL).origin) {
    return new Response('Forbidden', { status: 403 })
  }

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session || !isCampaignAdmin(session.user.id)) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!isStripePaymentsConfigured()) return redirectToCampaigns('error')

  const campaignId = (await request.formData()).get('campaignId')
  if (typeof campaignId !== 'string') {
    return new Response('Invalid campaign', { status: 400 })
  }
  const pending = await db.query.campaign.findFirst({
    where: and(
      eq(campaign.id, campaignId),
      eq(campaign.ownerUserId, session.user.id),
      eq(campaign.status, 'pending_payment'),
    ),
  })
  if (!pending) return redirectToCampaigns('error')

  try {
    const checkout = await continuePendingCampaignCheckout(
      pending,
      session.user.email,
    )
    if (checkout.status === 'funded') {
      return redirectToCampaigns('payment_submitted')
    }
    return Response.redirect(checkout.url, 303)
  } catch {
    return redirectToCampaigns('error')
  }
}

function redirectToCampaigns(result: 'error' | 'payment_submitted') {
  const url = new URL('/', env.APP_URL)
  url.searchParams.set('campaign', result)
  return Response.redirect(url, 303)
}
