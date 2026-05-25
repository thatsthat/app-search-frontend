import type { Metadata } from 'next'
import './globals.css'
import { getSession } from '@/lib/auth'
import LogoutButton from '@/components/logout-button'

export const metadata: Metadata = { title: 'App Store Research' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {session && (
          <header className="border-b px-6 py-2 flex items-center justify-end gap-3 text-sm text-muted-foreground">
            <span>{session.email}</span>
            <LogoutButton />
          </header>
        )}
        {children}
      </body>
    </html>
  )
}
