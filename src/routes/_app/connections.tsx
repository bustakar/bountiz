import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { disconnectTikTok, getTikTokConnections } from '@/lib/tiktok-functions'
import {
  disconnectYouTube,
  getYouTubeConnections,
} from '@/lib/youtube-functions'

export const Route = createFileRoute('/_app/connections')({
  loader: async () => {
    const [youtube, tiktok] = await Promise.all([
      getYouTubeConnections(),
      getTikTokConnections(),
    ])
    return { ...youtube, ...tiktok }
  },
  component: ConnectionsPage,
})

function ConnectionsPage() {
  const connections = Route.useLoaderData()
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [rejectedProviders, setRejectedProviders] = useState<
    ('YouTube' | 'TikTok')[]
  >([])
  const rejectedProvider = rejectedProviders[0]

  useEffect(() => {
    const providers: ('YouTube' | 'TikTok')[] = []
    if (connections.youtubeRejectedAccountIds.length > 0) {
      providers.push('YouTube')
      void Promise.allSettled(
        connections.youtubeRejectedAccountIds.map((accountId) =>
          disconnectYouTube({ data: { accountId } }),
        ),
      )
    }
    if (connections.tiktokRejectedAccountIds.length > 0) {
      providers.push('TikTok')
    }
    setRejectedProviders(providers)
  }, [
    connections.tiktokRejectedAccountIds,
    connections.youtubeRejectedAccountIds,
  ])

  const connectYouTube = () =>
    authClient.linkSocial({
      provider: 'google',
      callbackURL: '/connections',
      scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    })

  const connectTikTok = () =>
    authClient.linkSocial({
      provider: 'tiktok',
      callbackURL: '/connections',
      scopes: ['user.info.basic', 'video.list'],
    })

  const disconnect = async (
    accountId: string,
    disconnectAccount: typeof disconnectYouTube | typeof disconnectTikTok,
  ) => {
    setDisconnecting(accountId)
    try {
      await disconnectAccount({ data: { accountId } })
      await router.invalidate()
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <AlertDialog
        open={rejectedProviders.length > 0}
        onOpenChange={(open) =>
          !open && setRejectedProviders(([, ...remaining]) => remaining)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              No{' '}
              {rejectedProvider === 'YouTube'
                ? 'YouTube channel'
                : 'TikTok profile'}{' '}
              found
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose a{' '}
              {rejectedProvider === 'YouTube'
                ? 'Google account with a YouTube channel'
                : 'TikTok account with a valid profile'}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Okay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="grid grid-cols-[repeat(auto-fill,10rem)] gap-8">
        {connections.youtubeConnections.map(({ accountId, channel, error }) => (
          <div
            key={accountId}
            className="flex w-40 flex-col items-center gap-4 text-center"
          >
            {channel ? (
              <>
                <Avatar className="size-12">
                  <AvatarImage
                    src={channel.image ?? undefined}
                    alt={channel.name}
                  />
                  <AvatarFallback>{channel.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <h2 className="w-full truncate font-medium">{channel.name}</h2>
              </>
            ) : (
              <>
                <YouTubeLogo />
                <h2 className="font-medium">YouTube</h2>
                <p className="text-sm text-muted-foreground">
                  {error ?? 'No channel found'}
                </p>
              </>
            )}
            <Button
              variant="outline"
              disabled={disconnecting === accountId}
              onClick={() => void disconnect(accountId, disconnectYouTube)}
            >
              Disconnect
            </Button>
          </div>
        ))}
        <ConnectTile
          name="YouTube"
          logo={<YouTubeLogo />}
          disabled={!connections.youtubeAvailable}
          onConnect={connectYouTube}
        />
        {connections.tiktokConnections.map(({ accountId, profile }) => (
          <div
            key={accountId}
            className="flex w-40 flex-col items-center gap-4 text-center"
          >
            {profile ? (
              <>
                <Avatar className="size-12">
                  <AvatarImage
                    src={profile.image ?? undefined}
                    alt={`@${profile.username}`}
                  />
                  <AvatarFallback>
                    {profile.username.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="w-full truncate font-medium">
                  @{profile.username}
                </h2>
              </>
            ) : (
              <>
                <TikTokLogo />
                <h2 className="font-medium">TikTok</h2>
                <p className="text-sm text-muted-foreground">
                  Unable to load profile
                </p>
              </>
            )}
            <Button
              variant="outline"
              disabled={disconnecting === accountId}
              onClick={() => void disconnect(accountId, disconnectTikTok)}
            >
              Disconnect
            </Button>
          </div>
        ))}
        <ConnectTile
          name="TikTok"
          logo={<TikTokLogo />}
          disabled={!connections.tiktokAvailable}
          onConnect={connectTikTok}
        />
      </div>
    </main>
  )
}

function ConnectTile({
  name,
  logo,
  disabled,
  onConnect,
}: {
  name: string
  logo: ReactNode
  disabled: boolean
  onConnect: () => unknown
}) {
  return (
    <div className="flex w-40 flex-col items-center gap-4 text-center">
      {logo}
      <h2 className="font-medium">{name}</h2>
      <Button disabled={disabled} onClick={() => void onConnect()}>
        <Plus />
        Connect
      </Button>
    </div>
  )
}

const tiktokLogoPath =
  'M12.53 0c.41 3.47 2.35 5.54 5.73 5.76v3.9c-1.96.19-3.68-.45-5.67-1.65v7.29c0 9.27-10.1 12.16-14.16 5.52-2.61-4.27-1.01-11.75 7.36-12.05v4.12c-.64.1-1.32.25-1.94.46-1.86.63-2.91 1.8-2.62 3.86.56 3.94 7.79 5.11 7.19-2.59V.08L12.53 0Z'

function TikTokLogo() {
  return (
    <svg aria-hidden="true" className="size-12" viewBox="-3 -1 30 27">
      <path d={tiktokLogoPath} fill="#25f4ee" transform="translate(-1 1)" />
      <path d={tiktokLogoPath} fill="#fe2c55" transform="translate(1 0)" />
      <path d={tiktokLogoPath} className="fill-foreground" />
    </svg>
  )
}

function YouTubeLogo() {
  return (
    <svg
      aria-hidden="true"
      className="size-12 text-[#ff0000]"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  )
}
