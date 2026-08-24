const isVercel = process.env.VERCEL === '1'

function serverEnv(name: string, developmentDefault: string) {
  const value = process.env[name]
  if (value) return value
  if (isVercel) throw new Error(`${name} is required`)
  return developmentDefault
}

export const env = {
  APP_URL: serverEnv('APP_URL', 'http://localhost:3000'),
  BETTER_AUTH_SECRET: serverEnv(
    'BETTER_AUTH_SECRET',
    'development-secret-change-before-deploying',
  ),
  DATABASE_URL: serverEnv('DATABASE_URL', 'postgres://localhost/bountiz'),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY,
  TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET,
  INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID,
  INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PAYMENTS_WEBHOOK_SECRET: process.env.STRIPE_PAYMENTS_WEBHOOK_SECRET,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
}

if (isVercel && env.BETTER_AUTH_SECRET.length < 32)
  throw new Error('BETTER_AUTH_SECRET must be at least 32 characters')
