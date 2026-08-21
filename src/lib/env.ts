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
}

if (isVercel && env.BETTER_AUTH_SECRET.length < 32)
  throw new Error('BETTER_AUTH_SECRET must be at least 32 characters')
