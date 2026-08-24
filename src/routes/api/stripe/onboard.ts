import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'
import Stripe from 'stripe'

import { auth } from '@/lib/auth'
import { db } from '@/lib/database'
import { env } from '@/lib/env'
import { stripeConnectedAccount } from '@/lib/schema'
import { refreshStripeAccount } from '@/lib/stripe-account'
import {
  getStripe,
  getStripeAccountSnapshot,
  isStripeConfigured,
} from '@/lib/stripe'

export const Route = createFileRoute('/api/stripe/onboard')({
  server: { handlers: { POST: onboardCreator } },
})

async function onboardCreator({ request }: { request: Request }) {
  if (request.headers.get('origin') !== new URL(env.APP_URL).origin) {
    return new Response('Forbidden', { status: 403 })
  }

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (!isStripeConfigured()) return redirectToCampaigns('error')

  try {
    const stripe = getStripe()
    const existing = await db.query.stripeConnectedAccount.findFirst({
      where: eq(stripeConnectedAccount.userId, session.user.id),
    })
    const prepared = await getOrCreateStripeAccount(stripe, existing, {
      id: session.user.id,
      email: session.user.email,
    })
    const accountId = prepared.account.id

    if (prepared.needsPersist) {
      await db
        .insert(stripeConnectedAccount)
        .values({
          userId: session.user.id,
          stripeAccountId: accountId,
          ...getStripeAccountSnapshot(prepared.account),
        })
        .onConflictDoUpdate({
          target: stripeConnectedAccount.userId,
          set: {
            stripeAccountId: accountId,
            ...getStripeAccountSnapshot(prepared.account),
            refreshToken: null,
            refreshExpiresAt: null,
          },
        })
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      collection_options: {
        fields: 'eventually_due',
        future_requirements: 'include',
      },
      refresh_url: new URL('/?stripe=refresh', env.APP_URL).toString(),
      return_url: new URL('/?stripe=return', env.APP_URL).toString(),
    })
    return Response.redirect(link.url, 303)
  } catch {
    return redirectToCampaigns('error')
  }
}

async function getOrCreateStripeAccount(
  stripe: Stripe,
  existing: { stripeAccountId: string } | undefined,
  user: { id: string; email: string },
) {
  if (existing) {
    try {
      const refreshed = await refreshStripeAccount(
        eq(stripeConnectedAccount.userId, user.id),
      )
      if (refreshed) {
        return {
          account: { id: refreshed.stripeAccountId },
          needsPersist: false as const,
        }
      }
    } catch (error) {
      if (!isMissingStripeAccount(error)) throw error
    }
  }

  const account = await stripe.accounts.create(
    {
      email: user.email,
      capabilities: { transfers: { requested: true } },
      controller: {
        fees: { payer: 'application' },
        losses: { payments: 'application' },
        requirement_collection: 'stripe',
        stripe_dashboard: { type: 'express' },
      },
      metadata: { bountizUserId: user.id },
    },
    {
      idempotencyKey: existing
        ? `bountiz-creator-${user.id}-replace-${existing.stripeAccountId}`
        : `bountiz-creator-${user.id}`,
    },
  )
  return { account, needsPersist: true as const }
}

function isMissingStripeAccount(error: unknown) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === 'resource_missing'
  )
}

function redirectToCampaigns(stripe: 'error') {
  const url = new URL('/', env.APP_URL)
  url.searchParams.set('stripe', stripe)
  return Response.redirect(url, 303)
}
