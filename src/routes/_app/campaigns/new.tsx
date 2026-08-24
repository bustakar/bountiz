import { createFileRoute, redirect } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { maximumCampaignBudget, minimumCampaignBudget } from '@/lib/campaign'
import { getCampaignCreationAccess } from '@/lib/campaign-functions'

export const Route = createFileRoute('/_app/campaigns/new')({
  beforeLoad: async () => {
    const access = await getCampaignCreationAccess()
    if (!access.available) throw redirect({ to: '/' })
  },
  loader: () => ({ submissionId: crypto.randomUUID() }),
  component: NewCampaignPage,
})

function NewCampaignPage() {
  const { submissionId } = Route.useLoaderData()
  return (
    <main className="flex flex-1 justify-center p-6">
      <Card className="h-fit w-full max-w-xl">
        <CardHeader>
          <CardTitle>Create campaign</CardTitle>
          <CardDescription>
            Stripe collects the full budget before the campaign opens.
          </CardDescription>
        </CardHeader>
        <form method="post" action="/api/campaigns/create">
          <input type="hidden" name="submissionId" value={submissionId} />
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Campaign name</Label>
              <Input id="name" name="name" required maxLength={120} autoFocus />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Brief</Label>
              <textarea
                id="description"
                name="description"
                required
                maxLength={2_000}
                rows={6}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder="What should creators make?"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budget">Campaign budget (USD)</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                min={minimumCampaignBudget / 100}
                max={maximumCampaignBudget / 100}
                step="0.01"
                inputMode="decimal"
                required
                placeholder="500.00"
              />
              <p className="text-sm text-muted-foreground">
                This amount becomes the creator payout budget. Stripe fees are
                charged separately to the platform balance.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <a href="/">Cancel</a>
              </Button>
              <Button type="submit">Continue to payment</Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </main>
  )
}
