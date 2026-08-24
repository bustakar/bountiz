import {
  Link,
  Outlet,
  createFileRoute,
  getRouteApi,
  redirect,
  useRouterState,
} from '@tanstack/react-router'

import { AppSidebar } from '@/components/app-sidebar'
import { StripePayoutButton } from '@/components/stripe-payout-button'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { getSession } from '@/lib/auth-functions'

const campaignsRoute = getRouteApi('/_app/')

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/sign-in' })
    return { user: session.user }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user } = Route.useRouteContext()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const section = pathname === '/connections' ? 'Connections' : 'Campaigns'

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">{section}</span>
          {pathname === '/' && <CampaignsHeaderAction />}
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

function CampaignsHeaderAction() {
  const { campaigns, stripe } = campaignsRoute.useLoaderData()

  return (
    <div className="ml-auto flex items-center gap-2">
      {campaigns.canCreate && (
        <Button asChild>
          <Link to="/campaigns/new">Create campaign</Link>
        </Button>
      )}
      <StripePayoutButton stripe={stripe} />
    </div>
  )
}
