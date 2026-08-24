# Bountiz

Open-source, agent-first creator campaigns with payouts based on verified reach.

The instance administrator funds campaigns, creators submit published videos, and Bountiz tracks
performance and coordinates payouts through Stripe Connect. Bountiz is not an escrow service.

## Stack

- TanStack Start on Vercel
- PostgreSQL with Drizzle ORM, managed by Neon
- Better Auth
- Stripe Connect
- Cloudflare R2 for uploaded media
- Vercel Cron backed by durable PostgreSQL job state

The browser and agent API share the same domain services. Agent integrations use scoped API keys
and a documented HTTP API; MCP can remain a thin adapter over that API.

## Development

Requirements: Node.js 24+, pnpm 11+, and PostgreSQL when database features are enabled.

```sh
cp .env.example .env.local
pnpm install
pnpm dev
```

Run the complete local verification:

```sh
pnpm check
```

### Stripe Connect

Complete Stripe's Connect platform onboarding first. Then set `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET` to enable creator payout onboarding. Create a Snapshot event destination at
`/api/stripe/webhook`, select Connected accounts as its source, and subscribe it to
`account.updated` events.

For local testing, the Stripe CLI can forward Connect events and print the matching webhook secret:

```sh
stripe listen --events account.updated --forward-connect-to localhost:3000/api/stripe/webhook
```

### Campaign funding

Create the administrator account, then set `ADMIN_USER_ID` to its ID from the `user` table. Using
the immutable account ID prevents someone from claiming administrator access by registering a
configured email address. Campaign budgets use USD and are collected up front with Stripe Checkout.
Create a second Snapshot event destination at
`/api/stripe/payments-webhook`, select your platform account as its source, subscribe it to
`checkout.session.completed`, and save its signing secret as `STRIPE_PAYMENTS_WEBHOOK_SECRET`.

For local testing, run a separate Stripe CLI listener:

```sh
stripe listen --events checkout.session.completed --forward-to localhost:3000/api/stripe/payments-webhook
```

## Status

Bountiz is in initial development. Do not use it to accept or distribute real funds yet.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md).
