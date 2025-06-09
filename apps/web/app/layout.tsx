import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'
import { Toaster } from '@/components/ui/toaster'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaskTimeFlow - 革新的生産性向上SaaS',
  description: 'かんばん方式とタイムラインを統合した革新的生産性向上SaaS。ポモドーロタイマー、AI支援、Google連携で効率的なタスク管理を実現。',
  keywords: ['タスク管理', 'かんばん', 'タイムライン', 'ポモドーロ', '生産性', 'AI', 'Google連携'],
  authors: [{ name: 'TaskTimeFlow Team' }],
  creator: 'TaskTimeFlow',
  publisher: 'TaskTimeFlow',
  metadataBase: new URL('https://tasktimeflow.vercel.app'),
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://tasktimeflow.vercel.app',
    title: 'TaskTimeFlow - 革新的生産性向上SaaS',
    description: 'かんばん方式とタイムラインを統合した革新的生産性向上SaaS',
    siteName: 'TaskTimeFlow',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TaskTimeFlow - 革新的生産性向上SaaS'
      }
    ]
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'TaskTimeFlow - 革新的生産性向上SaaS',
    description: 'かんばん方式とタイムラインを統合した革新的生産性向上SaaS',
    images: ['/og-image.png']
  },

  // PWA
  manifest: '/manifest.json',
  
  // Mobile
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },

  // Apple
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TaskTimeFlow',
    startupImage: [
      {
        url: '/icons/apple-splash-2048-2732.jpg',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
      },
      {
        url: '/icons/apple-splash-1668-2224.jpg', 
        media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
      },
      {
        url: '/icons/apple-splash-1536-2048.jpg',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
      },
      {
        url: '/icons/apple-splash-1125-2436.jpg',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
      },
      {
        url: '/icons/apple-splash-1242-2208.jpg',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
      },
      {
        url: '/icons/apple-splash-750-1334.jpg',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
      },
      {
        url: '/icons/apple-splash-640-1136.jpg',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
      }
    ]
  },

  // Other PWA meta
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'TaskTimeFlow',
    'application-name': 'TaskTimeFlow',
    'msapplication-TileColor': '#3B82F6',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#3B82F6'
  }
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        return failureCount < 3
      }
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        return failureCount < 1
      }
    }
  }
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* PWA Theme Colors */}
        <meta name="theme-color" content="#3B82F6" />
        <meta name="background-color" content="#ffffff" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#3B82F6" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileImage" content="/icons/mstile-144x144.png" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
        
        {/* Prevent zooming on form focus (iOS) */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Schema.org structured data */}
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "TaskTimeFlow",
              "description": "かんばん方式とタイムラインを統合した革新的生産性向上SaaS",
              "url": "https://tasktimeflow.vercel.app",
              "applicationCategory": "ProductivityApplication",
              "operatingSystem": "All",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "JPY"
              }
            })
          }}
        />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ServiceWorkerRegistration>
              <div className="min-h-screen bg-background antialiased">
                {children}
              </div>
              <Toaster />
            </ServiceWorkerRegistration>
          </AuthProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
        
        {/* Analytics */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}