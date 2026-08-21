import { type } from 'arktype'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'

const youtubeScope = 'https://www.googleapis.com/auth/youtube.readonly'
const youtubeChannel = type({
  id: 'string',
  snippet: {
    title: 'string',
    thumbnails: { default: { url: 'string' } },
  },
})
const youtubeChannelsResponse = type({ items: youtubeChannel.array() })

export const getSession = createServerFn({ method: 'GET' }).handler(async () =>
  auth.api.getSession({ headers: getRequestHeaders() }),
)

export const requireSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')
    return session
  },
)

export const getConnections = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const accounts = await auth.api.listUserAccounts({
      headers,
    })
    const youtubeAccount = accounts.find(
      (account) =>
        account.providerId === 'google' &&
        account.scopes.includes(youtubeScope),
    )

    let channel = null
    if (youtubeAccount) {
      const { accessToken } = await auth.api.getAccessToken({
        body: { accountId: youtubeAccount.id },
        headers,
      })
      const response = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      if (!response.ok) throw new Error('Failed to load YouTube channel')

      const channels = youtubeChannelsResponse(await response.json())
      if (channels instanceof type.errors)
        throw new Error('YouTube returned an invalid channel')

      const connectedChannel = channels.items.at(0)
      if (connectedChannel)
        channel = {
          id: connectedChannel.id,
          name: connectedChannel.snippet.title,
          image: connectedChannel.snippet.thumbnails.default.url,
          accountId: youtubeAccount.id,
        }
    }

    return {
      channel,
      youtubeAvailable: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
    }
  },
)

export const disconnectYouTube = createServerFn({ method: 'POST' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const accounts = await auth.api.listUserAccounts({ headers })
    const account = accounts.find(
      (candidate) =>
        candidate.providerId === 'google' &&
        candidate.scopes.includes(youtubeScope),
    )
    if (!account) return

    const { accessToken } = await auth.api.getAccessToken({
      body: { accountId: account.id },
      headers,
    })
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: accessToken }),
    })
    if (!response.ok) throw new Error('Failed to revoke YouTube access')

    await auth.api.unlinkAccount({
      body: { accountId: account.id },
      headers,
    })
  },
)
