'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'

export interface UserSettings {
  showScheduledTasksInPool: boolean
  // 他の設定項目は必要に応じて追加
}

const DEFAULT_SETTINGS: UserSettings = {
  showScheduledTasksInPool: true // デフォルトは表示
}

export function useUserSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 設定を読み込む
  const loadSettings = useCallback(async () => {
    if (!user?.id) {
      setSettings(DEFAULT_SETTINGS)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Failed to load user settings:', error)
        setError(error.message)
        setSettings(DEFAULT_SETTINGS)
      } else {
        // 既存の設定とデフォルト設定をマージ
        const userSettings = data?.settings as Record<string, any> | null
        setSettings({
          ...DEFAULT_SETTINGS,
          ...(userSettings || {})
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setError('設定の読み込みに失敗しました')
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // 設定を保存する
  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!user?.id) {
      setError('ユーザーがログインしていません')
      return
    }

    try {
      setError(null)
      
      // 楽観的更新
      const updatedSettings = { ...settings, ...newSettings }
      setSettings(updatedSettings)

      const { error } = await supabase
        .from('profiles')
        .update({ 
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        console.error('Failed to save user settings:', error)
        setError(error.message)
        // エラーの場合は元に戻す
        await loadSettings()
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('設定の保存に失敗しました')
      // エラーの場合は元に戻す
      await loadSettings()
    }
  }, [user?.id, settings, loadSettings])

  // ユーザーが変更されたら設定を読み込む
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return {
    settings,
    loading,
    error,
    updateSettings,
    reloadSettings: loadSettings
  }
}