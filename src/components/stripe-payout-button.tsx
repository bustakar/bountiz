import { Button } from '@/components/ui/button'

type StripeConnection = {
  available: boolean
  connection: {
    status: 'ready' | 'incomplete' | 'pending' | 'restricted' | 'unavailable'
  } | null
}

export function StripePayoutButton({ stripe }: { stripe: StripeConnection }) {
  const status = stripe.connection?.status
  const dashboard =
    status === 'ready' || status === 'pending' || status === 'restricted'
  const action = dashboard
    ? 'Open Stripe'
    : stripe.connection
      ? 'Finish Stripe setup'
      : 'Connect Stripe'

  if (dashboard) {
    return (
      <Button
        disabled={!stripe.available}
        variant="outline"
        onClick={() => window.location.assign('/api/stripe/dashboard')}
      >
        {action}
      </Button>
    )
  }

  return (
    <form method="post" action="/api/stripe/onboard">
      <Button
        type="submit"
        disabled={!stripe.available}
        variant={stripe.connection ? 'outline' : 'default'}
      >
        {action}
      </Button>
    </form>
  )
}
