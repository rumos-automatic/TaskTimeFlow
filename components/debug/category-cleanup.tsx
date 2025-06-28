'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCategoryStoreWithAuth } from '@/lib/hooks/use-category-store-with-auth'
import { Trash2, RefreshCw, CheckCircle } from 'lucide-react'

export function CategoryCleanup() {
  const { 
    customCategories, 
    removeDuplicateCategories, 
    debugAndFix, 
    loading, 
    syncing 
  } = useCategoryStoreWithAuth()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')

  const handleRemoveDuplicates = async () => {
    setIsProcessing(true)
    setMessage('重複カテゴリを削除中...')
    
    try {
      await removeDuplicateCategories()
      setMessage('✅ 重複カテゴリの削除が完了しました')
    } catch (error) {
      setMessage('❌ 重複削除に失敗しました')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDebugAndFix = async () => {
    setIsProcessing(true)
    setMessage('カテゴリストアの修復中...')
    
    try {
      await debugAndFix()
      setMessage('✅ カテゴリストアの修復が完了しました')
    } catch (error) {
      setMessage('❌ 修復に失敗しました')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  // グループ化して重複を検出
  const groupedCategories = customCategories.reduce((acc, category) => {
    const key = category.name.toLowerCase()
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(category)
    return acc
  }, {} as Record<string, typeof customCategories>)

  const duplicateGroups = Object.entries(groupedCategories).filter(([_, categories]) => categories.length > 1)

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">カテゴリクリーンアップ</h2>
      
      <div className="space-y-4">
        {/* 現在の状況 */}
        <div className="p-4 bg-muted rounded">
          <h3 className="font-medium mb-2">現在の状況</h3>
          <p>カスタムカテゴリ総数: {customCategories.length}</p>
          <p>重複グループ数: {duplicateGroups.length}</p>
          
          {duplicateGroups.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-destructive">重複が検出されました:</p>
              <ul className="text-sm mt-1">
                {duplicateGroups.map(([name, categories]) => (
                  <li key={name} className="ml-4">
                    • {name} ({categories.length}個)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex space-x-2">
          <Button
            onClick={handleRemoveDuplicates}
            disabled={isProcessing || loading || syncing || duplicateGroups.length === 0}
            variant="destructive"
            className="flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>重複削除</span>
          </Button>
          
          <Button
            onClick={handleDebugAndFix}
            disabled={isProcessing || loading || syncing}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>完全修復</span>
          </Button>
        </div>

        {/* メッセージ */}
        {message && (
          <div className="p-3 bg-muted rounded text-sm">
            {message}
          </div>
        )}

        {/* 処理中表示 */}
        {(isProcessing || loading || syncing) && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>処理中...</span>
          </div>
        )}

        {/* 重複なしの場合 */}
        {duplicateGroups.length === 0 && !isProcessing && (
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>重複カテゴリはありません</span>
          </div>
        )}
      </div>
    </Card>
  )
}