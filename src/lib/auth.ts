import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import * as schema from '@/lib/auth-schema'
import { db } from '@/lib/database'
import { env } from '@/lib/env'
import { tiktokAuthPlugin } from '@/lib/tiktok-functions'

export const auth = betterAuth({
  appName: 'Bountiz',
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      trustedProviders: ['google', 'tiktok'],
      allowDifferentEmails: true,
    },
  },
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            accessType: 'offline',
            prompt: 'select_account consent',
          },
        }
      : {}),
  },
  plugins: [
    ...(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET
      ? [
          tiktokAuthPlugin({
            clientKey: env.TIKTOK_CLIENT_KEY,
            clientSecret: env.TIKTOK_CLIENT_SECRET,
          }),
        ]
      : []),
    tanstackStartCookies(),
  ],
})
