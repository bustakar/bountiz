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
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCampaignBudget } from '@/lib/campaign'
import { getCampaigns } from '@/lib/campaign-functions'
import { getStripeConnection } from '@/lib/stripe-functions'

const campaignsSearch = type({ 'stripe?': 'string', 'campaign?': 'string' })

export const Route = createFileRoute('/_app/')({
  validateSearch: campaignsSearch,
  loader: async () => {
    const [stripe, campaigns] = await Promise.all([
      getStripeConnection(),
      getCampaigns(),
    ])
    return { stripe, campaigns }
  },
  component: CampaignsPage,
})

function CampaignsPage() {
  const { campaign: campaignResult, stripe: stripeResult } = Route.useSearch()
  const { campaigns } = Route.useLoaderData()
  const router = useRouter()
  const stripeError = stripeResult === 'error'
  const campaignNotice = getCampaignNotice(campaignResult)

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
      <AlertDialog
        open={campaignNotice !== null}
        onOpenChange={(open) => {
          if (!open) void router.navigate({ to: '/', replace: true })
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{campaignNotice?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {campaignNotice?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Okay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {campaigns.campaigns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No campaigns yet</CardTitle>
            <CardDescription>Your campaigns will appear here.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CardTitle>{campaign.name}</CardTitle>
                    <CampaignStatusBadge status={campaign.status} />
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">
                    {formatCampaignBudget(campaign.budgetAmount)}
                  </span>
                </div>
                <CardDescription>{campaign.description}</CardDescription>
              </CardHeader>
              {campaign.status === 'pending_payment' && (
                <>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Payment is not complete yet.
                    </p>
                  </CardContent>
                  {campaign.canContinuePayment && (
                    <CardFooter>
                      <form method="post" action="/api/campaigns/checkout">
                        <input
                          type="hidden"
                          name="campaignId"
                          value={campaign.id}
                        />
                        <Button type="submit" variant="outline">
                          Continue payment
                        </Button>
                      </form>
                    </CardFooter>
                  )}
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}

function CampaignStatusBadge({
  status,
}: {
  status: 'pending_payment' | 'funded'
}) {
  const funded = status === 'funded'
  return (
    <span
      className={
        funded
          ? 'shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      }
    >
      {funded ? 'Funded' : 'Payment pending'}
    </span>
  )
}

function getCampaignNotice(value: string | undefined) {
  if (value === 'payment_submitted') {
    return {
      title: 'Payment submitted',
      description:
        'Stripe is confirming the payment. This campaign will show as funded shortly.',
    }
  }
  if (value === 'cancelled') {
    return {
      title: 'Payment not completed',
      description: 'You can continue payment from the campaign card.',
    }
  }
  if (value === 'error') {
    return {
      title: 'Campaign payment failed',
      description: 'We could not open Stripe Checkout. Please try again.',
    }
  }
  return null
}
