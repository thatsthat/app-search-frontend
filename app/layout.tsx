import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { getSession } from '@/lib/auth'
import LogoutButton from '@/components/logout-button'

export const metadata: Metadata = { title: 'App Store Research' }

async function SessionHeader() {
  const session = await getSession()
  if (!session) return null
  return (
    <header className="border-b px-6 py-2 flex items-center justify-end gap-3 text-sm text-muted-foreground">
      <span>{session.email}</span>
      <LogoutButton />
    </header>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <Suspense fallback={null}>
          <SessionHeader />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
