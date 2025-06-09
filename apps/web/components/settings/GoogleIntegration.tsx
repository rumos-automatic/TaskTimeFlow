'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Google,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Settings,
  Unlink,
  Activity
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useGoogleIntegration } from '@/hooks/useGoogleIntegration'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

export function GoogleIntegration() {
  const router = useRouter()
  const { toast } = useToast()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  
  const { 
    integration, 
    isLoading, 
    isConnected,
    connect,
    disconnect,
    sync,
    updateSettings
  } = useGoogleIntegration()

  // Handle OAuth redirect results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const error = params.get('error')

    if (success === 'google_connected') {
      toast({
        title: 'Google連携完了',
        description: 'Googleアカウントが正常に連携されました',
      })
      // Clean up URL
      router.replace('/settings/integrations')
    } else if (error) {
      toast({
        title: 'Google連携エラー',
        description: getErrorMessage(error),
        variant: 'destructive'
      })
      router.replace('/settings/integrations')
    }
  }, [router, toast])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const authUrl = await connect()
      if (authUrl) {
        window.location.href = authUrl
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'Google連携の開始に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Google連携を解除しますか？')) return

    try {
      await disconnect()
      toast({
        title: '連携解除完了',
        description: 'Googleアカウントの連携を解除しました',
      })
    } catch (error) {
      toast({
        title: 'エラー',
        description: '連携解除に失敗しました',
        variant: 'destructive'
      })
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncProgress(0)
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await sync()
      
      clearInterval(progressInterval)
      setSyncProgress(100)

      toast({
        title: '同期完了',
        description: `${result.itemsSynced}件のアイテムを同期しました`,
      })
    } catch (error) {
      toast({
        title: 'エラー',
        description: '同期に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setTimeout(() => {
        setIsSyncing(false)
        setSyncProgress(0)
      }, 1000)
    }
  }

  const handleSettingChange = async (key: string, value: boolean) => {
    try {
      await updateSettings({ [key]: value })
      toast({
        title: '設定更新',
        description: '設定を更新しました',
      })
    } catch (error) {
      toast({
        title: 'エラー',
        description: '設定の更新に失敗しました',
        variant: 'destructive'
      })
    }
  }

  const getErrorMessage = (error: string): string => {
    const errorMessages: Record<string, string> = {
      oauth_error: 'Google認証でエラーが発生しました',
      missing_params: '必要なパラメータが不足しています',
      invalid_state: 'セキュリティトークンが無効です',
      auth_mismatch: '認証情報が一致しません',
      db_error: 'データベースエラーが発生しました',
      callback_error: 'コールバック処理でエラーが発生しました'
    }
    return errorMessages[error] || 'エラーが発生しました'
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Google className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Google連携</CardTitle>
                <CardDescription>
                  GoogleカレンダーとGoogle Todoとの同期設定
                </CardDescription>
              </div>
            </div>
            {isConnected ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                接続済み
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">
                <XCircle className="h-3 w-3 mr-1" />
                未接続
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {isConnected && integration ? (
            <div className="space-y-4">
              {/* Account Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {integration.provider_data?.picture && (
                    <img 
                      src={integration.provider_data.picture}
                      alt="Google Account"
                      className="h-10 w-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{integration.provider_email}</p>
                    <p className="text-sm text-gray-500">
                      最終同期: {integration.last_synced_at ? 
                        formatDistanceToNow(new Date(integration.last_synced_at), { 
                          addSuffix: true,
                          locale: ja 
                        }) : 
                        '未同期'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">同期</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                  >
                    <Unlink className="h-4 w-4" />
                    <span className="ml-2">解除</span>
                  </Button>
                </div>
              </div>

              {/* Sync Progress */}
              {isSyncing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>同期中...</span>
                    <span>{syncProgress}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-2" />
                </div>
              )}

              {/* Sync Settings */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">同期設定</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <Label htmlFor="sync-calendar" className="text-sm">
                        Googleカレンダー同期
                      </Label>
                    </div>
                    <Switch
                      id="sync-calendar"
                      checked={integration.sync_calendar}
                      onCheckedChange={(checked) => handleSettingChange('sync_calendar', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-gray-400" />
                      <Label htmlFor="sync-tasks" className="text-sm">
                        Google Todo同期
                      </Label>
                    </div>
                    <Switch
                      id="sync-tasks"
                      checked={integration.sync_tasks}
                      onCheckedChange={(checked) => handleSettingChange('sync_tasks', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <Label htmlFor="sync-enabled" className="text-sm">
                        自動同期
                      </Label>
                    </div>
                    <Switch
                      id="sync-enabled"
                      checked={integration.sync_enabled}
                      onCheckedChange={(checked) => handleSettingChange('sync_enabled', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Sync Status */}
              {integration.status === 'error' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    同期エラーが発生しています。再度接続してください。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mb-4">
                <Google className="h-12 w-12 mx-auto text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">
                Googleアカウントを連携して、カレンダーとタスクを同期しましょう
              </p>
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    接続中...
                  </>
                ) : (
                  <>
                    <Google className="mr-2 h-4 w-4" />
                    Googleアカウントを連携
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Information */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">同期情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">カレンダーID</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {integration?.calendar_id || 'primary'}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">タスクリストID</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {integration?.task_list_id || '@default'}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">同期頻度</span>
                <span className="text-gray-900">リアルタイム</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default GoogleIntegration