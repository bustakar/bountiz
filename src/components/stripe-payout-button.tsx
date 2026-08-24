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

  return (
    <Button
      disabled={!stripe.available || status === 'unavailable'}
      variant={stripe.connection ? 'outline' : 'default'}
      onClick={() =>
        window.location.assign(
          dashboard ? '/api/stripe/dashboard' : '/api/stripe/onboard',
        )
      }
    >
      {action}
    </Button>
  )
}
