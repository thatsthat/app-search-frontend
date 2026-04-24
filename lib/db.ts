import pg from 'pg'

declare global {
  var __pgPool: pg.Pool | undefined
}

const pool = global.__pgPool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL })

if (process.env.NODE_ENV !== 'production') global.__pgPool = pool

export { pool }
