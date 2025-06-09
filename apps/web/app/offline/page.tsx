'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WifiOff, RefreshCw, Smartphone, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [offlineActions, setOfflineActions] = useState<any[]>([])
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load offline actions from localStorage
    loadOfflineActions()

    // Check last sync time
    const lastSyncTime = localStorage.getItem('lastSyncTime')
    if (lastSyncTime) {
      setLastSync(new Date(lastSyncTime))
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadOfflineActions = () => {
    try {
      const actions = localStorage.getItem('offlineActions')
      if (actions) {
        setOfflineActions(JSON.parse(actions))
      }
    } catch (error) {
      console.error('Failed to load offline actions:', error)
    }
  }

  const clearOfflineActions = () => {
    localStorage.removeItem('offlineActions')
    setOfflineActions([])
  }

  const retryConnection = () => {
    window.location.reload()
  }

  const offlineFeatures = [
    {
      icon: CheckCircle,
      title: 'タスク閲覧',
      description: 'キャッシュされたタスクの表示',
      available: true
    },
    {
      icon: CheckCircle,
      title: 'ポモドーロタイマー',
      description: 'オフラインでタイマー使用可能',
      available: true
    },
    {
      icon: AlertCircle,
      title: 'タスク同期',
      description: 'オンライン復帰時に自動同期',
      available: false
    },
    {
      icon: AlertCircle,
      title: 'リアルタイム更新',
      description: 'インターネット接続が必要',
      available: false
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Status Header */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <WifiOff className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-red-900">
              {isOnline ? 'サーバーに接続できません' : 'オフラインモード'}
            </CardTitle>
            <CardDescription className="text-red-700">
              {isOnline 
                ? 'インターネットは接続されていますが、サーバーにアクセスできません。'
                : 'インターネット接続を確認してください。'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={retryConnection} className="mr-3">
              <RefreshCw className="h-4 w-4 mr-2" />
              再試行
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              戻る
            </Button>
          </CardContent>
        </Card>

        {/* Offline Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              オフライン機能
            </CardTitle>
            <CardDescription>
              インターネット接続がなくても使用できる機能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offlineFeatures.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      feature.available 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <IconComponent className={`h-5 w-5 mt-0.5 ${
                        feature.available ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <h4 className={`font-medium text-sm ${
                          feature.available ? 'text-green-900' : 'text-gray-700'
                        }`}>
                          {feature.title}
                        </h4>
                        <p className={`text-xs ${
                          feature.available ? 'text-green-700' : 'text-gray-500'
                        }`}>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        {offlineActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                同期待ちアクション
              </CardTitle>
              <CardDescription>
                オンライン復帰時に自動同期される操作
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {offlineActions.map((action, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200">
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        {action.type}
                      </p>
                      <p className="text-xs text-yellow-700">
                        {new Date(action.timestamp).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div className="text-yellow-600">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={clearOfflineActions}>
                  同期待ちをクリア
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Last Sync */}
        {lastSync && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              最後の同期: {lastSync.toLocaleString('ja-JP')}
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/tasks'}
              >
                タスク表示
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/pomodoro'}
              >
                ポモドーロ
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/'}
              >
                ホームに戻る
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          <p>
            オフライン時もTaskTimeFlowの主要機能をお使いいただけます。
            <br />
            インターネット接続が復旧すると、自動的にデータが同期されます。
          </p>
        </div>
      </div>
    </div>
  )
}