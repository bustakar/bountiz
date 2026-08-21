import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import * as schema from '@/lib/auth-schema'
import { db } from '@/lib/database'
import { env } from '@/lib/env'

export const auth = betterAuth({
  appName: 'Bountiz',
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true },
  plugins: [tanstackStartCookies()],
})
