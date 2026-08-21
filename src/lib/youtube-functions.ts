import { type } from 'arktype'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'

const youtubeScope = 'https://www.googleapis.com/auth/youtube.readonly'
const youtubeChannel = type({
  id: 'string',
  snippet: {
    title: 'string',
    'customUrl?': 'string',
    thumbnails: {
      'default?': { url: 'string' },
      'medium?': { url: 'string' },
      'high?': { url: 'string' },
    },
  },
})
const youtubeChannelsResponse = type({ 'items?': youtubeChannel.array() })
const disconnectYouTubeInput = type({ accountId: 'string' })

export const getConnections = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const accounts = await auth.api.listUserAccounts({ headers })
    const youtubeAccounts = accounts.filter(
      (account) =>
        account.providerId === 'google' &&
        account.scopes.includes(youtubeScope),
    )

    const connectionAttempts = await Promise.allSettled(
      youtubeAccounts.map(async (youtubeAccount) => {
        const { accessToken } = await auth.api.getAccessToken({
          body: { accountId: youtubeAccount.id },
          headers,
        })
        const response = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (!response.ok) {
          const body = await response.text()
          if (body.includes('youtubeSignupRequired')) {
            return {
              accountId: youtubeAccount.id,
              channel: null,
              error: null,
              rejected: true,
            }
          }

          return {
            accountId: youtubeAccount.id,
            channel: null,
            error: 'Unable to load channel',
            rejected: false,
          }
        }

        const channels = youtubeChannelsResponse(await response.json())
        if (channels instanceof type.errors)
          throw new Error('YouTube returned an invalid channel')

        const connectedChannel = channels.items?.at(0)
        if (!connectedChannel) {
          return {
            accountId: youtubeAccount.id,
            channel: null,
            error: null,
            rejected: true,
          }
        }

        const thumbnails = connectedChannel.snippet.thumbnails
        const thumbnailUrl =
          thumbnails.default?.url ??
          thumbnails.medium?.url ??
          thumbnails.high?.url
        const image = thumbnailUrl
          ? await fetchImageDataUrl(thumbnailUrl)
          : null

        return {
          accountId: youtubeAccount.id,
          error: null,
          rejected: false,
          channel: {
            id: connectedChannel.id,
            name:
              connectedChannel.snippet.customUrl ??
              connectedChannel.snippet.title,
            image,
          },
        }
      }),
    )
    const youtubeConnections = connectionAttempts.map((attempt, index) =>
      attempt.status === 'fulfilled'
        ? attempt.value
        : {
            accountId: youtubeAccounts[index].id,
            channel: null,
            error: 'Unable to load channel',
            rejected: false,
          },
    )

    return {
      youtubeConnections: youtubeConnections.filter(
        (connection) => !connection.rejected,
      ),
      youtubeRejectedAccountIds: youtubeConnections
        .filter((connection) => connection.rejected)
        .map((connection) => connection.accountId),
      youtubeAvailable: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
    }
  },
)

export const disconnectYouTube = createServerFn({ method: 'POST' })
  .validator(disconnectYouTubeInput)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const accounts = await auth.api.listUserAccounts({ headers })
    const account = accounts.find(
      (candidate) =>
        candidate.id === data.accountId &&
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
  })

async function fetchImageDataUrl(url: string) {
  try {
    const response = await fetch(url)
    const contentType = response.headers.get('content-type')
    if (!response.ok || !contentType?.startsWith('image/')) return null

    const image = Buffer.from(await response.arrayBuffer()).toString('base64')
    return `data:${contentType};base64,${image}`
  } catch {
    return null
  }
}
