import Stripe from 'stripe'

import { env } from '@/lib/env'

export type StripeAccountSnapshot = {
  detailsSubmitted: boolean
  payoutsEnabled: boolean
  transfersStatus: string
  requirementsDue: string[]
  disabledReason: string | null
}

let client: Stripe | undefined

export function isStripeConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
}

export function isStripePaymentsConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PAYMENTS_WEBHOOK_SECRET)
}

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured')
  client ??= new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-07-29.dahlia',
    maxNetworkRetries: 2,
    typescript: true,
  })
  return client
}

export function getStripeAccountSnapshot(
  account: Stripe.Account,
): StripeAccountSnapshot {
  const requirementsDue = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ]

  return {
    detailsSubmitted: account.details_submitted,
    payoutsEnabled: account.payouts_enabled,
    transfersStatus: account.capabilities?.transfers ?? 'inactive',
    requirementsDue: [...new Set(requirementsDue)],
    disabledReason: account.requirements?.disabled_reason ?? null,
  }
}

export function getStripePayoutStatus(snapshot: StripeAccountSnapshot) {
  if (
    snapshot.detailsSubmitted &&
    snapshot.payoutsEnabled &&
    snapshot.transfersStatus === 'active'
  ) {
    return 'ready' as const
  }
  if (snapshot.disabledReason?.startsWith('rejected.')) {
    return 'restricted' as const
  }
  if (!snapshot.detailsSubmitted || snapshot.requirementsDue.length > 0) {
    return 'incomplete' as const
  }
  if (snapshot.disabledReason) return 'restricted' as const
  return 'pending' as const
}
