import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { user } from '@/lib/auth-schema'

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
  processedAt: timestamp('processed_at').defaultNow().notNull(),
})
