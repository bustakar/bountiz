import { createFileRoute } from '@tanstack/react-router'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/_app/')({
  component: CampaignsPage,
})

function CampaignsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Manage performance-based creator campaigns.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>No campaigns yet</CardTitle>
          <CardDescription>Your campaigns will appear here.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}
