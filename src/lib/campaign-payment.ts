import { and, eq, isNull, or } from 'drizzle-orm'
import type Stripe from 'stripe'

import { campaignCurrency } from '@/lib/campaign'
import { db } from '@/lib/database'
import { env } from '@/lib/env'
import { campaign } from '@/lib/schema'
import { getStripe } from '@/lib/stripe'

type CampaignCheckout = {
  id: string
  name: string
  budgetAmount: number
}

export function isCampaignAdmin(email: string) {
  return env.ADMIN_EMAIL?.trim().toLowerCase() === email.trim().toLowerCase()
}

export async function createCampaignCheckoutSession(
  value: CampaignCheckout,
  customerEmail: string,
) {
  const session = await getStripe().checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      client_reference_id: value.id,
      metadata: { campaignId: value.id },
      payment_intent_data: {
        metadata: { campaignId: value.id },
        transfer_group: `campaign_${value.id}`,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: campaignCurrency,
            unit_amount: value.budgetAmount,
            product_data: { name: `${value.name} campaign budget` },
          },
        },
      ],
      success_url: new URL(
        '/?campaign=payment_submitted',
        env.APP_URL,
      ).toString(),
      cancel_url: new URL('/?campaign=cancelled', env.APP_URL).toString(),
    },
    { idempotencyKey: `fund-campaign-${value.id}` },
  )
  if (!session.url) throw new Error('Stripe Checkout did not return a URL')
  return { id: session.id, url: session.url }
}

export async function fundCampaignFromCheckoutSession(
  session: Stripe.Checkout.Session,
) {
  const campaignId = session.metadata?.campaignId
  const paymentIntentId = getPaymentIntentId(session.payment_intent)
  if (
    !campaignId ||
    session.client_reference_id !== campaignId ||
    session.mode !== 'payment' ||
    session.payment_status !== 'paid' ||
    session.amount_total === null ||
    session.currency !== campaignCurrency ||
    !paymentIntentId
  ) {
    return false
  }

  const funded = await db
    .update(campaign)
    .set({
      status: 'funded',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      fundedAt: new Date(),
    })
    .where(
      and(
        eq(campaign.id, campaignId),
        eq(campaign.status, 'pending_payment'),
        eq(campaign.budgetAmount, session.amount_total),
        eq(campaign.currency, session.currency),
        or(
          isNull(campaign.stripeCheckoutSessionId),
          eq(campaign.stripeCheckoutSessionId, session.id),
        ),
      ),
    )
    .returning({ id: campaign.id })
  if (funded.length > 0) return true

  const existing = await db.query.campaign.findFirst({
    where: eq(campaign.id, campaignId),
  })
  return (
    existing?.status === 'funded' &&
    existing.stripeCheckoutSessionId === session.id &&
    existing.stripePaymentIntentId === paymentIntentId
  )
}

function getPaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null,
) {
  return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id
}
