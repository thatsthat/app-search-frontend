'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function SiteHeader() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setEmail(data?.email ?? null))
      .catch(() => setEmail(null))
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  if (!email) return null

  return (
    <header className="border-b px-6 py-2 flex items-center justify-end gap-3 text-sm text-muted-foreground">
      <span>{email}</span>
      <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
    </header>
  )
}
