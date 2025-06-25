import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TaskTimeFlow',
  description: 'Next-gen task management with timeboxing and Google Calendar integration',
  icons: {
    icon: '/favicon.ico',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="overscroll-none">
      <body className="overscroll-none overflow-hidden">{children}</body>
    </html>
  )
}