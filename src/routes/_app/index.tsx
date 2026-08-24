import { createFileRoute, useRouter } from '@tanstack/react-router'
import { type } from 'arktype'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getStripeConnection } from '@/lib/stripe-functions'

const campaignsSearch = type({ 'stripe?': 'string' })

export const Route = createFileRoute('/_app/')({
  validateSearch: campaignsSearch,
  loader: async () => ({ stripe: await getStripeConnection() }),
  component: CampaignsPage,
})

function CampaignsPage() {
  const { stripe: stripeResult } = Route.useSearch()
  const router = useRouter()
  const stripeError = stripeResult === 'error'

  return (
    <main className="flex flex-1 flex-col p-6">
      <AlertDialog
        open={stripeError}
        onOpenChange={(open) => {
          if (!open) void router.navigate({ to: '/', replace: true })
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stripe connection failed</AlertDialogTitle>
            <AlertDialogDescription>
              We could not open Stripe. Please try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Okay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card>
        <CardHeader>
          <CardTitle>No campaigns yet</CardTitle>
          <CardDescription>Your campaigns will appear here.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}
