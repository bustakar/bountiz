import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as authSchema from '@/lib/auth-schema'
import { env } from '@/lib/env'
import * as appSchema from '@/lib/schema'

const schema = { ...authSchema, ...appSchema }

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
})

export const db = drizzle({ client: pool, schema })
