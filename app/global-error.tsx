'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold">Something went wrong</h1>
            <button onClick={reset} className="text-sm underline underline-offset-4">
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
