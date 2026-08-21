import { createFileRoute, redirect } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { getSession } from '@/lib/auth-functions'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/sign-in' })
    return { user: session.user }
  },
  component: Home,
})

function Home() {
  const { user } = Route.useRouteContext()
  return (
    <main className="flex min-h-svh flex-col items-start gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Bountiz</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.email}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() =>
          void authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                window.location.href = '/sign-in'
              },
            },
          })
        }
      >
        Log out
      </Button>
    </main>
  )
}
