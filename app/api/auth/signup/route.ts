import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { pool } from '@/lib/db'

let tableReady = false
async function ensureTable() {
  if (tableReady) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      active        BOOLEAN NOT NULL DEFAULT FALSE,
      admin         BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS admin BOOLEAN NOT NULL DEFAULT FALSE;
    CREATE TABLE IF NOT EXISTS whitelist (
      email TEXT NOT NULL UNIQUE
    );
  `)
  tableReady = true
}

export async function POST(request: Request) {
  await ensureTable()
  const { email, password } = await request.json()

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'Invalid email or password (min 8 chars)' }, { status: 400 })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const hash = await bcrypt.hash(password, 12)

  const { rowCount } = await pool.query(
    'SELECT 1 FROM whitelist WHERE email = $1',
    [normalizedEmail]
  )
  const active = (rowCount ?? 0) > 0

  try {
    await pool.query(
      `INSERT INTO users (email, password_hash, active) VALUES ($1, $2, $3)`,
      [normalizedEmail, hash, active]
    )
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    throw err
  }

  const message = active
    ? 'Account created. You can now log in.'
    : 'Account created. Waiting for admin activation.'
  return NextResponse.json({ message }, { status: 201 })
}
