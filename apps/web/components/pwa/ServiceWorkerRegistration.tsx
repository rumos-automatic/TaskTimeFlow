'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, RefreshCw, X, Smartphone } from 'lucide-react'

interface ServiceWorkerRegistrationProps {
  children?: React.ReactNode
}

export function ServiceWorkerRegistration({ children }: ServiceWorkerRegistrationProps) {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallBanner(false)
      setInstallPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      setSwRegistration(registration)

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true)
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          setUpdateAvailable(true)
        }
      })

      console.log('Service Worker registered successfully')
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  const updateApp = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  const installApp = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const result = await installPrompt.userChoice
      
      if (result.outcome === 'accepted') {
        setShowInstallBanner(false)
        setInstallPrompt(null)
      }
    }
  }

  const dismissInstallBanner = () => {
    setShowInstallBanner(false)
    localStorage.setItem('installBannerDismissed', Date.now().toString())
  }

  // Check if install banner was recently dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('installBannerDismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
      if (dismissedTime > oneDayAgo) {
        setShowInstallBanner(false)
      }
    }
  }, [])

  return (
    <>
      {children}
      
      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:w-96">
          <Alert className="border-blue-200 bg-blue-50">
            <RefreshCw className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-800">
                新しいバージョンが利用可能です
              </span>
              <div className="flex space-x-2">
                <Button size="sm" onClick={updateApp}>
                  更新
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setUpdateAvailable(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Install App Banner */}
      {showInstallBanner && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:w-96">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center text-green-900">
                <Smartphone className="h-4 w-4 mr-2" />
                アプリをインストール
              </CardTitle>
              <CardDescription className="text-green-700 text-xs">
                ホーム画面に追加してより快適にご利用ください
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <Button size="sm" onClick={installApp} className="bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-1" />
                  インストール
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissInstallBanner}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

// Hook for PWA install status
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const result = await installPrompt.userChoice
      return result.outcome === 'accepted'
    }
    return false
  }

  return {
    isInstallable,
    isInstalled,
    install
  }
}

// Hook for service worker update
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg)

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
              }
            })
          }
        })
      })
    }
  }, [])

  const updateApp = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  return {
    updateAvailable,
    updateApp
  }
}

export default ServiceWorkerRegistration