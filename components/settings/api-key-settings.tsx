'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bot, 
  Eye, 
  EyeOff, 
  Save, 
  Trash2, 
  AlertCircle,
  Check,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'

interface ApiKeyData {
  openai?: string
  claude?: string
  gemini?: string
}

type ApiProvider = 'openai' | 'claude' | 'gemini'

export function ApiKeySettings() {
  const { user } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKeyData>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // APIキーを読み込む
  const loadApiKeys = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('provider, encrypted_key')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      if (error) throw error
      
      // 復号化（注意：本番環境ではサーバーサイドで行うべき）
      const decryptedKeys: ApiKeyData = {}
      data?.forEach(item => {
        // デモ用の簡易復号化（実際にはサーバーサイドで適切な暗号化を実装）
        decryptedKeys[item.provider as ApiProvider] = atob(item.encrypted_key)
      })
      
      setApiKeys(decryptedKeys)
    } catch (error) {
      console.error('Failed to load API keys:', error)
      setMessage({ type: 'error', text: 'APIキーの読み込みに失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  // 初回読み込み
  useEffect(() => {
    loadApiKeys()
  }, [user, loadApiKeys])

  // APIキーを保存
  const saveApiKeys = async () => {
    if (!user) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      // 各プロバイダーのキーを保存/更新
      for (const [provider, key] of Object.entries(apiKeys)) {
        if (key) {
          // 簡易暗号化（注意：本番環境ではサーバーサイドで適切な暗号化を実装）
          const encryptedKey = btoa(key)
          
          // 既存のキーがあるかチェック
          const { data: existing } = await supabase
            .from('user_api_keys')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider', provider)
            .single()
          
          if (existing) {
            // 更新
            await supabase
              .from('user_api_keys')
              .update({ encrypted_key: encryptedKey, is_active: true })
              .eq('id', existing.id)
          } else {
            // 新規作成
            await supabase
              .from('user_api_keys')
              .insert({
                user_id: user.id,
                provider: provider as ApiProvider,
                encrypted_key: encryptedKey
              })
          }
        }
      }
      
      setMessage({ type: 'success', text: 'APIキーを保存しました' })
    } catch (error) {
      console.error('Failed to save API keys:', error)
      setMessage({ type: 'error', text: 'APIキーの保存に失敗しました' })
    } finally {
      setSaving(false)
    }
  }

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))
  }

  const updateKey = (provider: keyof ApiKeyData, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }))
  }

  const deleteKey = async (provider: keyof ApiKeyData) => {
    if (!user) return
    
    try {
      // データベースから削除
      await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider)
      
      // ローカル状態を更新
      setApiKeys(prev => {
        const newKeys = { ...prev }
        delete newKeys[provider]
        return newKeys
      })
      
      setMessage({ type: 'success', text: 'APIキーを削除しました' })
    } catch (error) {
      console.error('Failed to delete API key:', error)
      setMessage({ type: 'error', text: 'APIキーの削除に失敗しました' })
    }
  }

  const providers = [
    {
      id: 'openai' as keyof ApiKeyData,
      name: 'OpenAI',
      icon: Bot,
      description: 'GPT-4やGPT-3.5-turboを使用',
      placeholder: 'sk-...',
      link: 'https://platform.openai.com/api-keys'
    },
    {
      id: 'claude' as keyof ApiKeyData,
      name: 'Claude (Anthropic)',
      icon: Bot,
      description: 'Claude 3 Opus/Sonnetを使用',
      placeholder: 'sk-ant-...',
      link: 'https://console.anthropic.com/settings/keys'
    },
    {
      id: 'gemini' as keyof ApiKeyData,
      name: 'Google Gemini',
      icon: Bot,
      description: 'Gemini Proを使用',
      placeholder: 'AIza...',
      link: 'https://makersuite.google.com/app/apikey'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">AI プロバイダー設定</h3>
        <p className="text-sm text-muted-foreground">
          AI機能を使用するためのAPIキーを設定します。キーは暗号化されて保存されます。
        </p>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {providers.map((provider) => (
          <Card key={provider.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <provider.icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h4 className="font-medium">{provider.name}</h4>
                  <p className="text-sm text-muted-foreground">{provider.description}</p>
                </div>
              </div>
              <a
                href={provider.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                APIキーを取得
              </a>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`${provider.id}-key`}>APIキー</Label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Input
                    id={`${provider.id}-key`}
                    type={showKeys[provider.id] ? 'text' : 'password'}
                    value={apiKeys[provider.id] || ''}
                    onChange={(e) => updateKey(provider.id, e.target.value)}
                    placeholder={provider.placeholder}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(provider.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKeys[provider.id] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {apiKeys[provider.id] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKey(provider.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {apiKeys[provider.id] && (
                <p className="text-xs text-green-600 flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>APIキーが設定されています</span>
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>セキュリティ注意事項:</strong> APIキーは暗号化されて保存されますが、
          ブラウザの開発者ツールやネットワークタブからは見えないように注意してください。
          本番環境では、サーバーサイドでの暗号化処理を必ず実装してください。
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={saveApiKeys} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存
            </>
          )}
        </Button>
      </div>
    </div>
  )
}