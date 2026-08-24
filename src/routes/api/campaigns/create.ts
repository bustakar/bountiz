import { and, eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'

import { auth } from '@/lib/auth'
import { campaignCurrency, parseCampaignInput } from '@/lib/campaign'
import {
  createCampaignCheckoutSession,
  isCampaignAdmin,
} from '@/lib/campaign-payment'
import { db } from '@/lib/database'
import { env } from '@/lib/env'
import { campaign } from '@/lib/schema'
import { isStripePaymentsConfigured } from '@/lib/stripe'

export const Route = createFileRoute('/api/campaigns/create')({
  server: { handlers: { POST: createCampaign } },
})

async function createCampaign({ request }: { request: Request }) {
  if (request.headers.get('origin') !== new URL(env.APP_URL).origin) {
    return new Response('Forbidden', { status: 403 })
  }

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session || !isCampaignAdmin(session.user.email)) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!isStripePaymentsConfigured()) return redirectToCampaigns('error')

  const form = await request.formData()
  const input = parseCampaignInput({
    name: form.get('name'),
    description: form.get('description'),
    budget: form.get('budget'),
  })
  if (!input) return new Response('Invalid campaign', { status: 400 })

  const id = crypto.randomUUID()
  await db.insert(campaign).values({
    id,
    ownerUserId: session.user.id,
    name: input.name,
    description: input.description,
    budgetAmount: input.budgetAmount,
    currency: campaignCurrency,
  })

  try {
    const checkout = await createCampaignCheckoutSession(
      { id, name: input.name, budgetAmount: input.budgetAmount },
      session.user.email,
    )
    await db
      .update(campaign)
      .set({ stripeCheckoutSessionId: checkout.id })
      .where(and(eq(campaign.id, id), eq(campaign.status, 'pending_payment')))
    return Response.redirect(checkout.url, 303)
  } catch {
    await db
      .delete(campaign)
      .where(and(eq(campaign.id, id), eq(campaign.status, 'pending_payment')))
    return redirectToCampaigns('error')
  }
}

function redirectToCampaigns(result: 'error') {
  const url = new URL('/', env.APP_URL)
  url.searchParams.set('campaign', result)
  return Response.redirect(url, 303)
}
