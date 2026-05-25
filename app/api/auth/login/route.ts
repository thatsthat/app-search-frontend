import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { pool } from '@/lib/db'
import { signSession, sessionCookieOptions } from '@/lib/auth'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const normalizedEmail = String(email).toLowerCase().trim()

  const { rows } = await pool.query<{
    id: number; password_hash: string; active: boolean; admin: boolean
  }>(
    `SELECT id, password_hash, active, admin FROM users WHERE email = $1`,
    [normalizedEmail]
  )

  const user = rows[0]
  const validPassword = user && await bcrypt.compare(password, user.password_hash)

  if (!user || !validPassword) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (!user.active) {
    return NextResponse.json({ error: 'Account not yet activated. Please contact the administrator.' }, { status: 403 })
  }

  const token = await signSession({ userId: user.id, email: normalizedEmail, isAdmin: user.admin })
  const response = NextResponse.json({ ok: true })
  response.cookies.set(sessionCookieOptions(token))
  return response
}
