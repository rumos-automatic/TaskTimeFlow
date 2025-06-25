import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TaskTimeFlow',
  description: 'Next-gen task management with timeboxing and Google Calendar integration',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}