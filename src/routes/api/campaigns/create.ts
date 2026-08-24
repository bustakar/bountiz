import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'

import { auth } from '@/lib/auth'
import {
  campaignCurrency,
  parseCampaignInput,
  parseCampaignSubmissionId,
} from '@/lib/campaign'
import {
  continueCampaignCheckout,
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
  if (!session || !isCampaignAdmin(session.user.id)) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!isStripePaymentsConfigured()) return redirectToCampaigns('error')

  const form = await request.formData()
  const input = parseCampaignInput({
    name: form.get('name'),
    description: form.get('description'),
    budget: form.get('budget'),
  })
  const id = parseCampaignSubmissionId(form.get('submissionId'))
  if (!input || !id) return new Response('Invalid campaign', { status: 400 })

  await db
    .insert(campaign)
    .values({
      id,
      ownerUserId: session.user.id,
      name: input.name,
      description: input.description,
      budgetAmount: input.budgetAmount,
      currency: campaignCurrency,
    })
    .onConflictDoNothing()

  const pending = await db.query.campaign.findFirst({
    where: eq(campaign.id, id),
  })
  if (
    !pending ||
    pending.ownerUserId !== session.user.id ||
    pending.name !== input.name ||
    pending.description !== input.description ||
    pending.budgetAmount !== input.budgetAmount ||
    pending.currency !== campaignCurrency ||
    pending.status !== 'pending_payment'
  ) {
    return new Response('Campaign submission already used', { status: 409 })
  }

  try {
    const checkout = await continueCampaignCheckout(pending, session.user.email)
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
