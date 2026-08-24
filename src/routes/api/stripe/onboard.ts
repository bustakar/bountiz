import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'

import { auth } from '@/lib/auth'
import { db } from '@/lib/database'
import { env } from '@/lib/env'
import { stripeConnectedAccount } from '@/lib/schema'
import {
  getStripe,
  getStripeAccountSnapshot,
  isStripeConfigured,
} from '@/lib/stripe'

export const Route = createFileRoute('/api/stripe/onboard')({
  server: { handlers: { GET: onboardCreator } },
})

async function onboardCreator({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (!isStripeConfigured()) return redirectToCampaigns('error')

  try {
    const stripe = getStripe()
    const existing = await db.query.stripeConnectedAccount.findFirst({
      where: eq(stripeConnectedAccount.userId, session.user.id),
    })
    const account = existing
      ? await stripe.accounts.retrieve(existing.stripeAccountId)
      : await stripe.accounts.create(
          {
            email: session.user.email,
            capabilities: { transfers: { requested: true } },
            controller: {
              fees: { payer: 'application' },
              losses: { payments: 'application' },
              requirement_collection: 'stripe',
              stripe_dashboard: { type: 'express' },
            },
            metadata: { bountizUserId: session.user.id },
          },
          { idempotencyKey: `bountiz-creator-${session.user.id}` },
        )

    await db
      .insert(stripeConnectedAccount)
      .values({
        userId: session.user.id,
        stripeAccountId: account.id,
        ...getStripeAccountSnapshot(account),
      })
      .onConflictDoUpdate({
        target: stripeConnectedAccount.userId,
        set: getStripeAccountSnapshot(account),
      })

    const link = await stripe.accountLinks.create({
      account: account.id,
      type: 'account_onboarding',
      collection_options: {
        fields: 'eventually_due',
        future_requirements: 'include',
      },
      refresh_url: new URL('/api/stripe/onboard', env.APP_URL).toString(),
      return_url: new URL('/?stripe=return', env.APP_URL).toString(),
    })
    return Response.redirect(link.url, 303)
  } catch {
    return redirectToCampaigns('error')
  }
}

function redirectToCampaigns(stripe: 'error') {
  const url = new URL('/', env.APP_URL)
  url.searchParams.set('stripe', stripe)
  return Response.redirect(url, 303)
}
