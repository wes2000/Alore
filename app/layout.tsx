import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wildborne',
  description: 'A browser-based top-down RPG with pets, procedural worlds, and deep skill systems.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
