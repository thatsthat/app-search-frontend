import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { pool } from '@/lib/db'

const COOKIE = 'session'
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-me-in-production-please-use-env'
)

export interface SessionPayload {
  userId: number
  email: string
  isAdmin: boolean
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      isAdmin: payload.isAdmin as boolean,
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  const session = await verifySession(token)
  if (!session) return null

  const { rows } = await pool.query<{ admin: boolean }>(
    'SELECT admin FROM users WHERE id = $1',
    [session.userId]
  )
  if (!rows[0]) return null

  return { ...session, isAdmin: rows[0].admin }
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  }
}

export function clearCookieOptions() {
  return {
    name: COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}
