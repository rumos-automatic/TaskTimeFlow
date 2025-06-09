'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  CheckSquare,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Loader2,
  List
} from 'lucide-react'
import { useGoogleService } from '@/hooks/useGoogleIntegration'
import { useTasksSyncWithGoogle } from '@/hooks/useTasksSync'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface GoogleTasksSyncProps {
  projectId: string
}

export function GoogleTasksSync({ projectId }: GoogleTasksSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const { isAvailable, isLoading: serviceLoading } = useGoogleService('tasks')
  const { 
    syncStatus, 
    lastSyncTime, 
    pendingChanges,
    syncToGoogle,
    syncFromGoogle,
    performBidirectionalSync,
    syncStats
  } = useTasksSyncWithGoogle(projectId)

  const handleSync = async (direction: 'to' | 'from' | 'bidirectional') => {
    setIsSyncing(true)
    setSyncProgress(0)
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      switch (direction) {
        case 'to':
          await syncToGoogle()
          break
        case 'from':
          await syncFromGoogle()
          break
        case 'bidirectional':
          await performBidirectionalSync()
          break
      }

      clearInterval(progressInterval)
      setSyncProgress(100)
    } finally {
      setTimeout(() => {
        setIsSyncing(false)
        setSyncProgress(0)
      }, 1000)
    }
  }

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <CheckSquare className="h-4 w-4 mr-2" />
            Google Todo同期
          </CardTitle>
          <CardDescription>
            タスクとGoogle Todoを同期
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Google Todo同期を使用するには、まずGoogle連携を有効にしてください。
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
              <CheckSquare className="h-4 w-4 mr-2" />
              Google Todo同期
            </CardTitle>
            <CardDescription>
              タスクとGoogle Todoを同期
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
        {/* Sync stats */}
        {syncStats && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{syncStats.totalTasks}</p>
              <p className="text-xs text-gray-500">総タスク数</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{syncStats.syncedTasks}</p>
              <p className="text-xs text-gray-500">同期済み</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{syncStats.pendingTasks}</p>
              <p className="text-xs text-gray-500">未同期</p>
            </div>
          </div>
        )}

        {/* Last sync info */}
        {lastSyncTime && (
          <div className="text-sm text-gray-500">
            最終同期: {formatDistanceToNow(lastSyncTime, { 
              addSuffix: true,
              locale: ja 
            })}
          </div>
        )}

        {/* Sync progress */}
        {isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>同期中...</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
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

        {/* Task lists info */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <List className="h-4 w-4 text-gray-400" />
            <span className="text-sm">タスクリスト</span>
          </div>
          <code className="text-xs bg-white px-2 py-1 rounded">TaskTimeFlow</code>
        </div>

        {/* Sync info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• TaskTimeFlowのタスクがGoogle Todoと双方向で同期されます</p>
          <p>• タスクの状態、期限、説明が同期されます</p>
          <p>• 削除されたタスクも同期されます</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default GoogleTasksSync