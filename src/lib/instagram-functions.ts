import { type } from 'arktype'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import type { BetterAuthPlugin } from 'better-auth'
import type { OAuth2Tokens, OAuthProvider } from 'better-auth/oauth2'

export const instagramBasicScope = 'instagram_business_basic'

const instagramProfile = type({
  id: 'string > 0',
  user_id: 'string > 0',
  username: 'string > 0',
  'name?': 'string',
  'account_type?': 'string',
  'profile_picture_url?': 'string.url',
})
type InstagramProfile = typeof instagramProfile.infer
type InstagramProfileResult =
  | { status: 'valid'; profile: InstagramProfile }
  | { status: 'invalid' }
  | { status: 'error' }

const instagramShortToken = type({
  access_token: 'string > 0',
})
const instagramLongToken = type({
  access_token: 'string > 0',
  expires_in: 'number > 0',
  token_type: 'string > 0',
})
const instagramEnvelope = type({ data: 'unknown[]' })
const instagramGraphError = type({
  error: {
    code: 'number',
    message: 'string',
    'type?': 'string',
  },
})
const instagramOAuthError = type({
  code: 'number',
  error_message: 'string',
  error_type: 'string',
})
const disconnectInstagramInput = type({ accountId: 'string' })
const requestTimeoutMs = 5_000
const refreshLeadTimeSeconds = 7 * 24 * 60 * 60
const instagramAuthorizationUrl = 'https://www.instagram.com/oauth/authorize'
const instagramTokenUrl = 'https://api.instagram.com/oauth/access_token'
const instagramLongTokenUrl = 'https://graph.instagram.com/access_token'
const instagramRefreshTokenUrl =
  'https://graph.instagram.com/refresh_access_token'
const instagramProfileUrl =
  'https://graph.instagram.com/me?fields=id,user_id,username,name,account_type,profile_picture_url'

type InstagramCredentials = { appId: string; appSecret: string }

export function createInstagramProvider(
  credentials: InstagramCredentials,
): OAuthProvider<InstagramProfile> {
  return {
    id: 'instagram',
    name: 'Instagram',
    disableImplicitSignUp: true,
    accountSubject: ({ profile }) => profile.id,
    createAuthorizationURL: ({ state, scopes, redirectURI }) => {
      const url = new URL(instagramAuthorizationUrl)
      url.searchParams.set('client_id', credentials.appId)
      url.searchParams.set('redirect_uri', redirectURI)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set(
        'scope',
        [...new Set([instagramBasicScope, ...(scopes ?? [])])].join(','),
      )
      url.searchParams.set('state', state)
      url.searchParams.set('enable_fb_login', 'false')
      return url
    },
    validateAuthorizationCode: ({ code, redirectURI }) =>
      exchangeInstagramCode(credentials, code, redirectURI),
    refreshAccessToken: (token) => refreshInstagramToken(token),
    getUserInfo: async (token) => {
      if (!token.accessToken) return null
      const result = await fetchInstagramProfile(token.accessToken)
      if (result.status !== 'valid') return null

      return {
        user: {
          name: result.profile.name || result.profile.username,
          image: result.profile.profile_picture_url,
          emailVerified: false,
        },
        data: result.profile,
      }
    },
  }
}

export function instagramAuthPlugin(credentials: InstagramCredentials) {
  const provider = createInstagramProvider(credentials)
  return {
    id: 'bountiz-instagram',
    init: (context) => ({
      context: {
        socialProviders: [provider, ...context.socialProviders],
      },
    }),
  } satisfies BetterAuthPlugin
}

export const getInstagramConnections = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { auth } = await import('@/lib/auth')
  const { env } = await import('@/lib/env')
  const headers = getRequestHeaders()
  const accounts = await auth.api.listUserAccounts({ headers })
  const instagramAccounts = accounts.filter(
    (account) => account.providerId === 'instagram',
  )

  const connectionAttempts = await Promise.allSettled(
    instagramAccounts.map(async (account) => {
      if (!account.scopes.includes(instagramBasicScope)) {
        await auth.api.unlinkAccount({
          body: { accountId: account.id },
          headers,
        })
        return { accountId: account.id, profile: null, rejected: true }
      }

      const { accessToken } = await auth.api.getAccessToken({
        body: { accountId: account.id },
        headers,
      })
      const result = await fetchInstagramProfile(accessToken)
      if (result.status === 'invalid') {
        await auth.api.unlinkAccount({
          body: { accountId: account.id },
          headers,
        })
        return { accountId: account.id, profile: null, rejected: true }
      }
      if (result.status === 'error')
        throw new Error('Instagram was unable to load the profile')

      return {
        accountId: account.id,
        rejected: false,
        profile: {
          id: result.profile.user_id,
          username: result.profile.username,
          image: result.profile.profile_picture_url
            ? await fetchImageDataUrl(result.profile.profile_picture_url)
            : null,
        },
      }
    }),
  )
  const instagramConnections = connectionAttempts.map((attempt, index) =>
    attempt.status === 'fulfilled'
      ? attempt.value
      : {
          accountId: instagramAccounts[index].id,
          profile: null,
          rejected: false,
        },
  )

  return {
    instagramConnections: instagramConnections.filter(
      (connection) => !connection.rejected,
    ),
    instagramRejectedAccountIds: instagramConnections
      .filter((connection) => connection.rejected)
      .map((connection) => connection.accountId),
    instagramAvailable: Boolean(
      env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET,
    ),
  }
})

export const disconnectInstagram = createServerFn({ method: 'POST' })
  .validator(disconnectInstagramInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const headers = getRequestHeaders()
    const accounts = await auth.api.listUserAccounts({ headers })
    const account = accounts.find(
      (candidate) =>
        candidate.id === data.accountId && candidate.providerId === 'instagram',
    )
    if (!account) return

    await auth.api.unlinkAccount({ body: { accountId: account.id }, headers })
  })

async function exchangeInstagramCode(
  credentials: InstagramCredentials,
  code: string,
  redirectURI: string,
) {
  const body = new FormData()
  body.set('client_id', credentials.appId)
  body.set('client_secret', credentials.appSecret)
  body.set('grant_type', 'authorization_code')
  body.set('redirect_uri', redirectURI)
  body.set('code', code.replace(/#_$/, ''))

  const response = await fetch(instagramTokenUrl, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
  const payload: unknown = await response.json()
  if (!response.ok) throwInstagramError(payload, 'token exchange')

  const token = parseEnvelope(payload, instagramShortToken)
  if (!token) throw new Error('Instagram returned an invalid token response')

  const url = new URL(instagramLongTokenUrl)
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', credentials.appSecret)
  url.searchParams.set('access_token', token.access_token)
  const longResponse = await fetch(url, {
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
  const longPayload: unknown = await longResponse.json()
  if (!longResponse.ok) throwInstagramError(longPayload, 'token extension')

  const longToken = instagramLongToken(longPayload)
  if (longToken instanceof type.errors)
    throw new Error('Instagram returned an invalid long-lived token')

  return toOAuthTokens(longToken, instagramBasicScope)
}

async function refreshInstagramToken(token: string) {
  const url = new URL(instagramRefreshTokenUrl)
  url.searchParams.set('grant_type', 'ig_refresh_token')
  url.searchParams.set('access_token', token)
  const response = await fetch(url, {
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
  const payload: unknown = await response.json()
  if (!response.ok) throwInstagramError(payload, 'token refresh')

  const refreshed = instagramLongToken(payload)
  if (refreshed instanceof type.errors)
    throw new Error('Instagram returned an invalid refreshed token')
  return toOAuthTokens(refreshed)
}

function toOAuthTokens(
  token: typeof instagramLongToken.infer,
  permissions?: string,
): OAuth2Tokens {
  const now = Date.now()
  const refreshAfterSeconds = Math.max(
    24 * 60 * 60,
    token.expires_in - refreshLeadTimeSeconds,
  )
  const expiresAt = new Date(now + token.expires_in * 1_000)

  // Meta refreshes a long-lived access token rather than issuing a separate
  // refresh token. Store the encrypted token in both Better Auth fields.
  return {
    accessToken: token.access_token,
    refreshToken: token.access_token,
    tokenType: token.token_type,
    accessTokenExpiresAt: new Date(now + refreshAfterSeconds * 1_000),
    refreshTokenExpiresAt: expiresAt,
    scopes: permissions ? permissions.split(',').filter(Boolean) : undefined,
    raw: token,
  }
}

async function fetchInstagramProfile(
  accessToken: string,
): Promise<InstagramProfileResult> {
  const response = await fetch(instagramProfileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { status: response.ok ? 'invalid' : 'error' }
  }

  if (!response.ok) {
    const error = instagramGraphError(payload)
    return !(error instanceof type.errors) && error.error.code === 190
      ? { status: 'invalid' }
      : { status: 'error' }
  }

  const profile = parseEnvelope(payload, instagramProfile)
  return profile ? { status: 'valid', profile } : { status: 'invalid' }
}

function parseEnvelope<T>(
  payload: unknown,
  schema: (value: unknown) => T | type.errors,
) {
  const direct = schema(payload)
  if (!(direct instanceof type.errors)) return direct

  const envelope = instagramEnvelope(payload)
  if (envelope instanceof type.errors) return null
  const nested = schema(envelope.data.at(0))
  return nested instanceof type.errors ? null : nested
}

function throwInstagramError(payload: unknown, action: string): never {
  const graphError = instagramGraphError(payload)
  if (!(graphError instanceof type.errors))
    throw new Error(
      `Instagram ${action} failed: ${graphError.error.code}: ${graphError.error.message}`,
    )

  const oauthError = instagramOAuthError(payload)
  if (!(oauthError instanceof type.errors))
    throw new Error(
      `Instagram ${action} failed: ${oauthError.code}: ${oauthError.error_message}`,
    )

  throw new Error(`Instagram ${action} failed`)
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
