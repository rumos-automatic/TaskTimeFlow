'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Calendar,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Loader2
} from 'lucide-react'
import { useGoogleService } from '@/hooks/useGoogleIntegration'
import { useTimelineSyncWithGoogle } from '@/hooks/useTimelineSync'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface GoogleCalendarSyncProps {
  date?: Date
  projectId?: string
}

export function GoogleCalendarSync({ date = new Date(), projectId }: GoogleCalendarSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const { isAvailable, isLoading: serviceLoading } = useGoogleService('calendar')
  const { 
    syncStatus, 
    lastSyncTime, 
    pendingChanges,
    syncToGoogle,
    syncFromGoogle,
    performBidirectionalSync
  } = useTimelineSyncWithGoogle()

  const handleSync = async (direction: 'to' | 'from' | 'bidirectional') => {
    setIsSyncing(true)
    try {
      switch (direction) {
        case 'to':
          await syncToGoogle(date)
          break
        case 'from':
          await syncFromGoogle(date)
          break
        case 'bidirectional':
          await performBidirectionalSync(date)
          break
      }
    } finally {
      setIsSyncing(false)
    }
  }

  if (serviceLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Googleカレンダー同期
          </CardTitle>
          <CardDescription>
            タイムラインとGoogleカレンダーを同期
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Googleカレンダー同期を使用するには、まずGoogle連携を有効にしてください。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Googleカレンダー同期
            </CardTitle>
            <CardDescription>
              タイムラインとGoogleカレンダーを同期
            </CardDescription>
          </div>
          {syncStatus === 'synced' ? (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              同期済み
            </Badge>
          ) : syncStatus === 'pending' ? (
            <Badge className="bg-yellow-100 text-yellow-700">
              <Clock className="h-3 w-3 mr-1" />
              {pendingChanges}件の変更
            </Badge>
          ) : (
            <Badge variant="outline">
              <AlertCircle className="h-3 w-3 mr-1" />
              未同期
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Last sync info */}
        {lastSyncTime && (
          <div className="text-sm text-gray-500">
            最終同期: {formatDistanceToNow(lastSyncTime, { 
              addSuffix: true,
              locale: ja 
            })}
          </div>
        )}

        {/* Sync actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSync('to')}
            disabled={isSyncing || syncStatus === 'synced'}
          >
            <ArrowUpDown className="h-4 w-4 mr-1 rotate-180" />
            Googleへ
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSync('bidirectional')}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            双方向
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSync('from')}
            disabled={isSyncing}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Googleから
          </Button>
        </div>

        {/* Pending changes alert */}
        {syncStatus === 'pending' && pendingChanges > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {pendingChanges}件の未同期の変更があります。同期を実行してください。
            </AlertDescription>
          </Alert>
        )}

        {/* Sync info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• TaskTimeFlowのタイムラインスロットがGoogleカレンダーのイベントとして同期されます</p>
          <p>• 双方向同期では両方の変更が統合されます</p>
          <p>• 競合が発生した場合は、新しい変更が優先されます</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default GoogleCalendarSync