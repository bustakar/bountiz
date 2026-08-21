import { createFileRoute, redirect } from '@tanstack/react-router'

import { AppSidebar } from '@/components/app-sidebar'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { getSession } from '@/lib/auth-functions'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/sign-in' })
    return { user: session.user }
  },
  component: CampaignsPage,
})

function CampaignsPage() {
  const { user } = Route.useRouteContext()
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">Bountiz</span>
        </header>
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
              <CardDescription>
                Your campaigns will appear here.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
