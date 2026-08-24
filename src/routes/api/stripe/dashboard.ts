import { eq } from 'drizzle-orm'
import { createFileRoute } from '@tanstack/react-router'

import { auth } from '@/lib/auth'
import { db } from '@/lib/database'
import { env } from '@/lib/env'
import { stripeConnectedAccount } from '@/lib/schema'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

export const Route = createFileRoute('/api/stripe/dashboard')({
  server: { handlers: { GET: openStripeDashboard } },
})

async function openStripeDashboard({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (!isStripeConfigured()) return redirectToCampaigns()

  const connection = await db.query.stripeConnectedAccount.findFirst({
    where: eq(stripeConnectedAccount.userId, session.user.id),
  })
  if (!connection) return redirectToCampaigns()

  try {
    const link = await getStripe().accounts.createLoginLink(
      connection.stripeAccountId,
    )
    return Response.redirect(link.url, 303)
  } catch {
    return redirectToCampaigns()
  }
}

function redirectToCampaigns() {
  const url = new URL('/', env.APP_URL)
  url.searchParams.set('stripe', 'error')
  return Response.redirect(url, 303)
}
