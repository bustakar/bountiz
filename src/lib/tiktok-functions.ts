import { type } from 'arktype'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { tiktok } from 'better-auth/social-providers'
import type { BetterAuthPlugin } from 'better-auth'
import type { TiktokProfile } from 'better-auth/social-providers'

const tiktokUser = type({
  open_id: 'string > 0',
  username: 'string > 0',
  display_name: 'string > 0',
  avatar_large_url: 'string.url',
})
type TikTokUser = typeof tiktokUser.infer
type TikTokProfileResult =
  | { status: 'valid'; profile: TikTokUser }
  | { status: 'invalid' }
  | { status: 'error' }
const tiktokUserInfoResponse = type({
  'data?': { 'user?': 'unknown' },
  error: {
    code: 'string',
    message: 'string',
    'log_id?': 'string',
  },
})
const tiktokRevokeErrorResponse = type({
  error: 'string',
  error_description: 'string',
  'log_id?': 'string',
})
const emptyResponse = type('undefined')
const tiktokTokenResponse = type({
  access_token: 'string > 0',
  expires_in: 'number > 0',
  open_id: 'string > 0',
  refresh_expires_in: 'number > 0',
  refresh_token: 'string > 0',
  scope: 'string',
  token_type: 'string > 0',
})
const disconnectTikTokInput = type({ accountId: 'string' })
const requestTimeoutMs = 5_000
const tiktokUserInfoUrl =
  'https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name,avatar_large_url'
const tiktokTokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/'

export function tiktokAuthPlugin(credentials: {
  clientKey: string
  clientSecret: string
}) {
  const provider = tiktok({
    ...credentials,
    getUserInfo: getTikTokOAuthUserInfo,
  })
  const validateAuthorizationCode: typeof provider.validateAuthorizationCode =
    ({ code, redirectURI }) =>
      exchangeTikTokToken(credentials, {
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectURI,
      })
  const refreshAccessToken: typeof provider.refreshAccessToken = (
    refreshToken,
  ) =>
    exchangeTikTokToken(credentials, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

  return {
    id: 'bountiz-tiktok',
    init: (context) => ({
      context: {
        socialProviders: [
          {
            ...provider,
            validateAuthorizationCode,
            refreshAccessToken,
          },
          ...context.socialProviders,
        ],
      },
    }),
  } satisfies BetterAuthPlugin
}

export async function getTikTokOAuthUserInfo(token: { accessToken?: string }) {
  if (!token.accessToken) return null

  const result = await fetchTikTokProfile(token.accessToken)
  if (result.status !== 'valid') return null

  const profile: TiktokProfile = { data: { user: result.profile } }
  return {
    user: {
      email: result.profile.username,
      name: result.profile.display_name,
      image: result.profile.avatar_large_url,
      emailVerified: false,
    },
    data: profile,
  }
}

async function exchangeTikTokToken(
  credentials: { clientKey: string; clientSecret: string },
  parameters: Record<string, string>,
) {
  const response = await fetch(tiktokTokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: credentials.clientKey,
      client_secret: credentials.clientSecret,
      ...parameters,
    }),
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
  const result: unknown = await response.json()
  const token = tiktokTokenResponse(result)
  if (token instanceof type.errors) {
    throw new Error('TikTok returned an invalid token response')
  }

  const now = Date.now()
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenType: token.token_type,
    scopes: token.scope ? token.scope.split(',') : [],
    accessTokenExpiresAt: new Date(now + token.expires_in * 1_000),
    refreshTokenExpiresAt: new Date(now + token.refresh_expires_in * 1_000),
    raw: token,
  }
}

export const getTikTokConnections = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { auth } = await import('@/lib/auth')
    const { env } = await import('@/lib/env')
    const headers = getRequestHeaders()
    const accounts = await auth.api.listUserAccounts({ headers })
    const tiktokAccounts = accounts.filter(
      (account) => account.providerId === 'tiktok',
    )

    const connectionAttempts = await Promise.allSettled(
      tiktokAccounts.map(async (account) => {
        const { accessToken } = await auth.api.getAccessToken({
          body: { accountId: account.id },
          headers,
        })
        const result = await fetchTikTokProfile(accessToken)

        if (result.status === 'invalid') {
          await unlinkTikTokAccount(account.id, headers, accessToken)
          return { accountId: account.id, profile: null, rejected: true }
        }
        if (result.status === 'error') {
          throw new Error('TikTok was unable to load the profile')
        }

        return {
          accountId: account.id,
          rejected: false,
          profile: {
            id: result.profile.open_id,
            username: result.profile.username,
            image: await fetchImageDataUrl(result.profile.avatar_large_url),
          },
        }
      }),
    )
    const tiktokConnections = connectionAttempts.map((attempt, index) =>
      attempt.status === 'fulfilled'
        ? attempt.value
        : {
            accountId: tiktokAccounts[index].id,
            profile: null,
            rejected: false,
          },
    )

    return {
      tiktokConnections: tiktokConnections.filter(
        (connection) => !connection.rejected,
      ),
      tiktokRejectedAccountIds: tiktokConnections
        .filter((connection) => connection.rejected)
        .map((connection) => connection.accountId),
      tiktokAvailable: Boolean(
        env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET,
      ),
    }
  },
)

export const disconnectTikTok = createServerFn({ method: 'POST' })
  .validator(disconnectTikTokInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const headers = getRequestHeaders()
    const accounts = await auth.api.listUserAccounts({ headers })
    const account = accounts.find(
      (candidate) =>
        candidate.id === data.accountId && candidate.providerId === 'tiktok',
    )
    if (!account) return

    await unlinkTikTokAccount(account.id, headers)
  })

async function unlinkTikTokAccount(
  accountId: string,
  headers: Headers,
  knownAccessToken?: string,
) {
  const { auth } = await import('@/lib/auth')
  const { env } = await import('@/lib/env')
  try {
    const accessToken =
      knownAccessToken ??
      (
        await auth.api.getAccessToken({
          body: { accountId },
          headers,
        })
      ).accessToken
    if (env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET) {
      const response = await fetch(
        'https://open.tiktokapis.com/v2/oauth/revoke/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: env.TIKTOK_CLIENT_KEY,
            client_secret: env.TIKTOK_CLIENT_SECRET,
            token: accessToken,
          }),
          signal: AbortSignal.timeout(requestTimeoutMs),
        },
      )
      await validateRevokeResponse(response)
    }
  } catch {
    // Revocation is best-effort; the local connection must still be removed.
  } finally {
    await auth.api.unlinkAccount({ body: { accountId }, headers })
  }
}

async function fetchTikTokProfile(
  accessToken: string,
): Promise<TikTokProfileResult> {
  const response = await fetch(tiktokUserInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    return { status: response.ok ? 'invalid' : 'error' }
  }
  const payload = tiktokUserInfoResponse(responseBody)

  if (payload instanceof type.errors) {
    return { status: response.ok ? 'invalid' : 'error' } as const
  }
  if (!response.ok || payload.error.code !== 'ok') {
    return { status: 'error' } as const
  }

  const profile = tiktokUser(payload.data?.user)
  if (profile instanceof type.errors) {
    return { status: 'invalid' } as const
  }
  return { status: 'valid', profile }
}

async function validateRevokeResponse(response: Response) {
  const body = await response.text()
  const payload: unknown = body ? JSON.parse(body) : undefined
  const result = response.ok
    ? emptyResponse(payload)
    : tiktokRevokeErrorResponse(payload)
  if (result instanceof type.errors)
    throw new Error('TikTok returned an invalid revoke response')
}

async function fetchImageDataUrl(url: string) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(requestTimeoutMs),
    })
    const contentType = response.headers.get('content-type')
    if (!response.ok || !contentType?.startsWith('image/')) return null

    const image = Buffer.from(await response.arrayBuffer()).toString('base64')
    return `data:${contentType};base64,${image}`
  } catch {
    return null
  }
}
