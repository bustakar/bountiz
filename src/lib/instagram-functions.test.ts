import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createInstagramProvider,
  instagramBasicScope,
  revokeInstagramPermissions,
} from '@/lib/instagram-functions'

const credentials = { appId: 'app-id', appSecret: 'app-secret' }

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Instagram OAuth provider', () => {
  it('creates the direct Instagram authorization URL', async () => {
    const provider = createInstagramProvider(credentials)
    const url = await provider.createAuthorizationURL({
      state: 'oauth-state',
      codeVerifier: 'unused',
      redirectURI: 'https://preview.example/api/auth/callback/instagram',
    })

    expect(url.origin + url.pathname).toBe(
      'https://www.instagram.com/oauth/authorize',
    )
    expect(url.searchParams.get('client_id')).toBe('app-id')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://preview.example/api/auth/callback/instagram',
    )
    expect(url.searchParams.get('scope')).toBe(instagramBasicScope)
    expect(url.searchParams.get('state')).toBe('oauth-state')
    expect(url.searchParams.get('enable_fb_login')).toBe('false')
    expect(url.searchParams.has('force_reauth')).toBe(false)
  })

  it('exchanges the code for a refreshable long-lived token', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T12:00:00Z'))
    const mockedFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'short-token',
          user_id: 123456789,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'long-token',
          expires_in: 60 * 24 * 60 * 60,
          token_type: 'bearer',
        }),
      )
    vi.stubGlobal('fetch', mockedFetch)

    const provider = createInstagramProvider(credentials)
    const tokens = await provider.validateAuthorizationCode({
      code: 'authorization-code#_',
      redirectURI: 'https://preview.example/api/auth/callback/instagram',
    })

    expect(mockedFetch).toHaveBeenCalledTimes(2)
    const tokenRequest = mockedFetch.mock.calls[0]
    expect(tokenRequest[0]).toBe('https://api.instagram.com/oauth/access_token')
    const body = tokenRequest[1]?.body
    expect(body).toBeInstanceOf(FormData)
    if (!(body instanceof FormData)) throw new Error('Expected FormData')
    expect(body.get('code')).toBe('authorization-code')

    expect(tokens).toMatchObject({
      accessToken: 'long-token',
      refreshToken: 'long-token',
      tokenType: 'bearer',
      scopes: [instagramBasicScope],
    })
    expect(tokens?.accessTokenExpiresAt).toEqual(
      new Date('2026-10-15T12:00:00Z'),
    )
    expect(tokens?.refreshTokenExpiresAt).toEqual(
      new Date('2026-10-22T12:00:00Z'),
    )
  })

  it('loads the connected professional profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValueOnce(
        jsonResponse({
          id: 'app-scoped-id',
          user_id: 'instagram-user-id',
          username: 'bountiz_creator',
          name: 'Bountiz Creator',
          account_type: 'Media_Creator',
          profile_picture_url: 'https://example.com/avatar.jpg',
        }),
      ),
    )

    const provider = createInstagramProvider(credentials)
    const result = await provider.getUserInfo({ accessToken: 'long-token' })

    expect(result?.user).toEqual({
      name: 'Bountiz Creator',
      image: 'https://example.com/avatar.jpg',
      emailVerified: false,
    })
    expect(
      result && provider.accountSubject({ profile: result.data, tokens: {} }),
    ).toBe('app-scoped-id')
  })

  it('refreshes Meta long-lived tokens using the stored token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValueOnce(
        jsonResponse({
          access_token: 'refreshed-token',
          expires_in: 60 * 24 * 60 * 60,
          token_type: 'bearer',
        }),
      ),
    )

    const provider = createInstagramProvider(credentials)
    const tokens = await provider.refreshAccessToken?.('old-token')

    expect(tokens).toMatchObject({
      accessToken: 'refreshed-token',
      refreshToken: 'refreshed-token',
    })
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining('access_token=old-token'),
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('revokes Instagram permissions through the Graph API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null)),
    )

    await revokeInstagramPermissions('long-token')

    expect(fetch).toHaveBeenCalledWith(
      'https://graph.instagram.com/me/permissions',
      expect.objectContaining({
        method: 'DELETE',
        headers: { Authorization: 'Bearer long-token' },
        signal: expect.any(AbortSignal),
      }),
    )
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
