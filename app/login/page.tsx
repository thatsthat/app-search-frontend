'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (mode === 'signup' && password !== confirm) {
        setError('Passwords do not match')
        return
      }

      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }

      if (mode === 'signup') {
        setInfo(data.message)
        setMode('login')
        setPassword('')
        setConfirm('')
      } else {
        router.push('/')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">App Store Research</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {info && (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            {info}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            {mode === 'signup' && (
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            )}
          </div>

          {mode === 'signup' && (
            <div className="space-y-1">
              <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
              <input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                onClick={() => { setMode('signup'); setError(''); setInfo(''); setConfirm('') }}
                className="font-medium underline-offset-4 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(''); setInfo(''); setConfirm('') }}
                className="font-medium underline-offset-4 hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
