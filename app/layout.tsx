import type { Metadata } from 'next'
import './globals.css'
import SiteHeader from '@/components/site-header'

export const metadata: Metadata = { title: 'App Store Research' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
