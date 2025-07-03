import { useState, useEffect, useMemo } from 'react'
import { Task } from '@/lib/types'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'

export type SortOrder = 
  | 'custom'           // 手動並び替え（デフォルト）
  | 'priority-desc'    // 優先度高→低
  | 'priority-asc'     // 優先度低→高
  | 'urgency-desc'     // 緊急度高→低
  | 'urgency-asc'      // 緊急度低→高
  | 'created-desc'     // 作成日新しい順
  | 'created-asc'      // 作成日古い順
  | 'time-asc'         // 推定時間短い順
  | 'time-desc'        // 推定時間長い順
  | 'title-asc'        // タイトルA→Z
  | 'title-desc'       // タイトルZ→A

export const SORT_OPTIONS: { value: SortOrder; label: string; icon?: string }[] = [
  { value: 'custom', label: 'カスタム並び', icon: '✏️' },
  { value: 'priority-desc', label: '優先度：高→低', icon: '🔴' },
  { value: 'priority-asc', label: '優先度：低→高', icon: '🟢' },
  { value: 'urgency-desc', label: '緊急度：高→低', icon: '⚡' },
  { value: 'urgency-asc', label: '緊急度：低→高', icon: '🔵' },
  { value: 'created-desc', label: '作成日：新しい順', icon: '📅' },
  { value: 'created-asc', label: '作成日：古い順', icon: '📆' },
  { value: 'time-asc', label: '時間：短い順', icon: '⏱️' },
  { value: 'time-desc', label: '時間：長い順', icon: '⏳' },
  { value: 'title-asc', label: 'タイトル：A→Z', icon: '🔤' },
  { value: 'title-desc', label: 'タイトル：Z→A', icon: '🔤' }
]

interface UserSettings {
  task_pool_sort?: SortOrder
  task_pool_sort_by_category?: Record<string, SortOrder>
}

export function useTaskSort(tasks: Task[], categoryId?: string) {
  const { user } = useAuth()
  const [sortOrder, setSortOrder] = useState<SortOrder>('custom')
  const [loading, setLoading] = useState(true)
  const [wasCustomBeforeDrag, setWasCustomBeforeDrag] = useState(false)

  // ユーザー設定の読み込み
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error

        const settings = ((data as any)?.settings as UserSettings) || {}
        
        // カテゴリ別の設定があればそれを使用、なければ全体設定を使用
        if (categoryId && settings.task_pool_sort_by_category?.[categoryId]) {
          setSortOrder(settings.task_pool_sort_by_category[categoryId])
        } else if (settings.task_pool_sort) {
          setSortOrder(settings.task_pool_sort)
        }
      } catch (error) {
        console.error('Failed to load sort settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [user, categoryId])

  // ソート順の保存
  const saveSortOrder = async (newOrder: SortOrder) => {
    if (!user) return

    try {
      // 現在の設定を取得
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError) throw fetchError

      const currentSettings = ((data as any)?.settings as UserSettings) || {}
      
      // 新しい設定を作成
      const newSettings: UserSettings = {
        ...currentSettings,
        task_pool_sort: newOrder
      }

      // カテゴリ別の設定も更新
      if (categoryId) {
        newSettings.task_pool_sort_by_category = {
          ...currentSettings.task_pool_sort_by_category,
          [categoryId]: newOrder
        }
      }

      // 保存
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ settings: newSettings } as any)
        .eq('id', user.id)

      if (updateError) throw updateError

      setSortOrder(newOrder)
    } catch (error) {
      console.error('Failed to save sort settings:', error)
    }
  }

  // ドラッグ開始時の処理
  const onDragStart = () => {
    setWasCustomBeforeDrag(sortOrder === 'custom')
  }

  // ドラッグ終了時の処理
  const onDragEnd = () => {
    // カスタム以外のソート中にドラッグした場合、カスタムに切り替え
    if (!wasCustomBeforeDrag && sortOrder !== 'custom') {
      saveSortOrder('custom')
    }
    setWasCustomBeforeDrag(false)
  }

  // ソート済みタスクの計算
  const sortedTasks = useMemo(() => {
    if (sortOrder === 'custom') {
      return tasks // 元の順序を保持
    }

    const sorted = [...tasks]
    
    switch (sortOrder) {
      case 'priority-desc':
        return sorted.sort((a, b) => {
          if (a.priority === b.priority) return 0
          return a.priority === 'high' ? -1 : 1
        })
      
      case 'priority-asc':
        return sorted.sort((a, b) => {
          if (a.priority === b.priority) return 0
          return a.priority === 'low' ? -1 : 1
        })
      
      case 'urgency-desc':
        return sorted.sort((a, b) => {
          if (a.urgency === b.urgency) return 0
          return a.urgency === 'high' ? -1 : 1
        })
      
      case 'urgency-asc':
        return sorted.sort((a, b) => {
          if (a.urgency === b.urgency) return 0
          return a.urgency === 'low' ? -1 : 1
        })
      
      case 'created-desc':
        return sorted.sort((a, b) => {
          const dateA = a.createdAt || new Date(0)
          const dateB = b.createdAt || new Date(0)
          return dateB.getTime() - dateA.getTime()
        })
      
      case 'created-asc':
        return sorted.sort((a, b) => {
          const dateA = a.createdAt || new Date(0)
          const dateB = b.createdAt || new Date(0)
          return dateA.getTime() - dateB.getTime()
        })
      
      case 'time-asc':
        return sorted.sort((a, b) => a.estimatedTime - b.estimatedTime)
      
      case 'time-desc':
        return sorted.sort((a, b) => b.estimatedTime - a.estimatedTime)
      
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ja'))
      
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title, 'ja'))
      
      default:
        return sorted
    }
  }, [tasks, sortOrder])

  return {
    sortedTasks,
    sortOrder,
    setSortOrder: saveSortOrder,
    loading,
    onDragStart,
    onDragEnd
  }
}