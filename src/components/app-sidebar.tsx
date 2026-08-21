import * as React from 'react'
import { CircleDollarSign, Plug } from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; image?: string | null }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <CircleDollarSign className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Bountiz</span>
                  <span className="truncate text-xs">Creator campaigns</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={[{ title: 'Connections', url: '/connections', icon: Plug }]}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ ...user, avatar: user.image ?? '' }} />
      </SidebarFooter>
    </Sidebar>
  )
}
