import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { user } from '@/lib/auth-schema'

export const campaignStatus = pgEnum('campaign_status', [
  'pending_payment',
  'funded',
])

export const campaign = pgTable(
  'campaign',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    budgetAmount: integer('budget_amount').notNull(),
    currency: text('currency').notNull(),
    status: campaignStatus('status').default('pending_payment').notNull(),
    stripeCheckoutSessionId: text('stripe_checkout_session_id'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    fundedAt: timestamp('funded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('campaign_stripe_checkout_session_id_uidx').on(
      table.stripeCheckoutSessionId,
    ),
    uniqueIndex('campaign_stripe_payment_intent_id_uidx').on(
      table.stripePaymentIntentId,
    ),
  ],
)

export const stripeConnectedAccount = pgTable(
  'stripe_connected_account',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    stripeAccountId: text('stripe_account_id').notNull(),
    detailsSubmitted: boolean('details_submitted').default(false).notNull(),
    payoutsEnabled: boolean('payouts_enabled').default(false).notNull(),
    transfersStatus: text('transfers_status').notNull(),
    requirementsDue: jsonb('requirements_due')
      .$type<string[]>()
      .default([])
      .notNull(),
    disabledReason: text('disabled_reason'),
    refreshToken: text('refresh_token'),
    refreshExpiresAt: timestamp('refresh_expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('stripe_connected_account_stripe_id_uidx').on(
      table.stripeAccountId,
    ),
  ],
)

export const stripeWebhookEvent = pgTable('stripe_webhook_event', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  processingToken: text('processing_token'),
  processingExpiresAt: timestamp('processing_expires_at'),
  processedAt: timestamp('processed_at'),
})
