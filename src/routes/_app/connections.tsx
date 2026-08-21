import { createFileRoute } from '@tanstack/react-router'
import { Check, Plus } from 'lucide-react'

import { authClient } from '@/lib/auth-client'
import { getConnections } from '@/lib/auth-functions'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_app/connections')({
  loader: () => getConnections(),
  component: ConnectionsPage,
})

function ConnectionsPage() {
  const connections = Route.useLoaderData()

  const connectYouTube = () =>
    authClient.linkSocial({
      provider: 'google',
      callbackURL: '/connections',
      scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    })

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Connections</h1>
        <p className="text-sm text-muted-foreground">
          Connect the accounts Bountiz uses to verify creator content.
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,10rem)] gap-8">
        <div className="flex w-40 flex-col items-center gap-4 text-center">
          <h2 className="font-medium">YouTube</h2>
          <YouTubeLogo />
          {connections.youtube ? (
            <Button variant="outline" disabled>
              <Check />
              Connected
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={!connections.youtubeAvailable}
              onClick={() => void connectYouTube()}
            >
              <Plus />
              Connect
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}

function YouTubeLogo() {
  return (
    <svg
      aria-hidden="true"
      className="size-12"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  )
}
