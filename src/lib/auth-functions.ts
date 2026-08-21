import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'

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
    const accounts = await auth.api.listUserAccounts({
      headers: getRequestHeaders(),
    })

    return {
      youtube: accounts.some((account) => account.providerId === 'google'),
      youtubeAvailable: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
    }
  },
)
