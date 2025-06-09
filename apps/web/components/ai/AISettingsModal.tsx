'use client'

import { useState, useEffect } from 'react'
import { useAIPreferences, useAIProviders, useAIUsageStatistics } from '@/hooks/useAI'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Settings,
  Brain,
  DollarSign,
  BarChart3,
  Key,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIProviderType, UserAIPreferences } from '@/types/ai'

interface AISettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  const [activeTab, setActiveTab] = useState('providers')
  const [apiKeys, setApiKeys] = useState<Record<AIProviderType, string>>({
    openai: '',
    claude: '',
    gemini: ''
  })
  const [showApiKeys, setShowApiKeys] = useState<Record<AIProviderType, boolean>>({
    openai: false,
    claude: false,
    gemini: false
  })
  const [validatingKeys, setValidatingKeys] = useState<Record<AIProviderType, boolean>>({
    openai: false,
    claude: false,
    gemini: false
  })
  const [keyValidation, setKeyValidation] = useState<Record<AIProviderType, boolean | null>>({
    openai: null,
    claude: null,
    gemini: null
  })
  
  const { preferences, isLoading, updatePreferences, isUpdating } = useAIPreferences()
  const { availableProviders, validateApiKey } = useAIProviders()
  const { data: usageStats } = useAIUsageStatistics()

  // Initialize form with current preferences
  useEffect(() => {
    if (preferences) {
      // Load saved API keys (in a real app, these would be loaded securely)
      // For now, we'll keep them empty for security
    }
  }, [preferences])

  const handleApiKeyChange = (provider: AIProviderType, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }))
    setKeyValidation(prev => ({ ...prev, [provider]: null }))
  }

  const handleValidateApiKey = async (provider: AIProviderType) => {
    const apiKey = apiKeys[provider]
    if (!apiKey.trim()) return

    setValidatingKeys(prev => ({ ...prev, [provider]: true }))
    
    try {
      const isValid = await validateApiKey(provider, apiKey)
      setKeyValidation(prev => ({ ...prev, [provider]: isValid }))
    } catch (error) {
      setKeyValidation(prev => ({ ...prev, [provider]: false }))
    } finally {
      setValidatingKeys(prev => ({ ...prev, [provider]: false }))
    }
  }

  const handleSaveApiKey = async (provider: AIProviderType) => {
    const apiKey = apiKeys[provider]
    if (!apiKey.trim()) return

    // In a real implementation, this would securely save the encrypted API key
    try {
      // Save to secure storage
      console.log(`Saving API key for ${provider}`)
    } catch (error) {
      console.error('Failed to save API key:', error)
    }
  }

  const handlePreferenceChange = (key: keyof UserAIPreferences, value: any) => {
    updatePreferences({ [key]: value })
  }

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'openai': return '🤖'
      case 'claude': return '🧠'
      case 'gemini': return '💎'
      default: return '🔬'
    }
  }

  const getValidationIcon = (status: boolean | null) => {
    if (status === null) return null
    return status ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    )
  }

  if (isLoading || !preferences) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-500" />
            <span>AI設定</span>
          </DialogTitle>
          <DialogDescription>
            AIプロバイダー、設定、使用状況を管理します
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="providers">プロバイダー</TabsTrigger>
              <TabsTrigger value="preferences">設定</TabsTrigger>
              <TabsTrigger value="usage">使用状況</TabsTrigger>
              <TabsTrigger value="advanced">詳細設定</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="providers" className="space-y-4 mt-4">
                {/* Current Provider */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">現在のプロバイダー</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Select
                      value={preferences.preferred_provider}
                      onValueChange={(value: AIProviderType) => 
                        handlePreferenceChange('preferred_provider', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            <div className="flex items-center space-x-2">
                              <span>{getProviderIcon(provider.id)}</span>
                              <span>{provider.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* API Keys */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Key className="h-4 w-4" />
                      <span>APIキー</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {availableProviders.map((provider) => (
                      <div key={provider.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {getProviderIcon(provider.id)} {provider.name}
                          </Label>
                          {getValidationIcon(keyValidation[provider.id])}
                        </div>
                        
                        <div className="flex space-x-2">
                          <div className="flex-1 relative">
                            <Input
                              type={showApiKeys[provider.id] ? "text" : "password"}
                              placeholder={`${provider.name} APIキーを入力`}
                              value={apiKeys[provider.id]}
                              onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowApiKeys(prev => ({
                                ...prev,
                                [provider.id]: !prev[provider.id]
                              }))}
                            >
                              {showApiKeys[provider.id] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleValidateApiKey(provider.id)}
                            disabled={!apiKeys[provider.id].trim() || validatingKeys[provider.id]}
                          >
                            {validatingKeys[provider.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            <span className="ml-1">検証</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveApiKey(provider.id)}
                            disabled={!apiKeys[provider.id].trim() || keyValidation[provider.id] !== true}
                          >
                            保存
                          </Button>
                        </div>

                        {keyValidation[provider.id] === false && (
                          <Alert variant="destructive">
                            <AlertDescription className="text-xs">
                              APIキーが無効です。正しいキーを入力してください。
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Provider Features */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">プロバイダー機能比較</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">機能</th>
                            {availableProviders.map(provider => (
                              <th key={provider.id} className="text-center py-2">
                                {getProviderIcon(provider.id)} {provider.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {['task_breakdown', 'time_estimation', 'scheduling_optimization', 'content_generation'].map(feature => (
                            <tr key={feature} className="border-b">
                              <td className="py-2">
                                {feature === 'task_breakdown' ? 'タスク分解' :
                                 feature === 'time_estimation' ? '時間見積もり' :
                                 feature === 'scheduling_optimization' ? 'スケジュール最適化' :
                                 feature === 'content_generation' ? 'コンテンツ生成' : feature}
                              </td>
                              {availableProviders.map(provider => (
                                <td key={provider.id} className="text-center py-2">
                                  {provider.features.includes(feature as any) ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-4 mt-4">
                {/* AI Behavior */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">AI動作設定</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">自動提案</Label>
                      <Switch
                        checked={preferences.auto_suggestions}
                        onCheckedChange={(checked) => handlePreferenceChange('auto_suggestions', checked)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">提案頻度</Label>
                      <Select
                        value={preferences.suggestion_frequency}
                        onValueChange={(value: 'low' | 'medium' | 'high') => 
                          handlePreferenceChange('suggestion_frequency', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">低（1日1回）</SelectItem>
                          <SelectItem value="medium">中（数時間ごと）</SelectItem>
                          <SelectItem value="high">高（リアルタイム）</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">自動適用</Label>
                      <Switch
                        checked={preferences.auto_apply_suggestions}
                        onCheckedChange={(checked) => handlePreferenceChange('auto_apply_suggestions', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">学習モード</Label>
                      <Switch
                        checked={preferences.learning_mode}
                        onCheckedChange={(checked) => handlePreferenceChange('learning_mode', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Privacy */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">プライバシー設定</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">プライバシーレベル</Label>
                      <Select
                        value={preferences.privacy_level}
                        onValueChange={(value: 'minimal' | 'balanced' | 'full') => 
                          handlePreferenceChange('privacy_level', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">最小限（基本情報のみ）</SelectItem>
                          <SelectItem value="balanced">バランス（推奨）</SelectItem>
                          <SelectItem value="full">フル（すべてのデータ）</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Management */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">コスト管理</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">月額制限 (USD)</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[preferences.cost_limit_monthly]}
                          onValueChange={([value]) => handlePreferenceChange('cost_limit_monthly', value)}
                          max={100}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          ${preferences.cost_limit_monthly}/月
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="space-y-4 mt-4">
                {usageStats && (
                  <>
                    {/* Usage Overview */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">使用状況概要</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">総セッション数:</span>
                            <span className="ml-2 font-medium">{usageStats.total_sessions}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">総コスト:</span>
                            <span className="ml-2 font-medium">${usageStats.total_cost_usd.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">総トークン:</span>
                            <span className="ml-2 font-medium">{usageStats.total_tokens_used.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">成功率:</span>
                            <span className="ml-2 font-medium">{usageStats.success_rate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Cost by Provider */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">プロバイダー別コスト</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {Object.entries(usageStats.cost_by_provider).map(([provider, cost]) => (
                            <div key={provider} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span>{getProviderIcon(provider)}</span>
                                <span className="text-sm">{provider}</span>
                              </div>
                              <span className="text-sm font-medium">${cost.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Monthly Usage */}
                    {usageStats.monthly_usage.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">月別使用状況</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {usageStats.monthly_usage.slice(0, 6).map((month) => (
                              <div key={month.month} className="flex items-center justify-between text-sm">
                                <span>{month.month}</span>
                                <div className="flex items-center space-x-4">
                                  <span>{month.sessions}セッション</span>
                                  <span>${month.cost_usd.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">詳細設定</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        これらの設定は上級ユーザー向けです。変更する前に影響を理解してください。
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label className="text-sm">トーン設定</Label>
                      <Select
                        value={preferences.tone_preference}
                        onValueChange={(value: 'formal' | 'casual' | 'technical' | 'friendly') => 
                          handlePreferenceChange('tone_preference', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="formal">フォーマル</SelectItem>
                          <SelectItem value="casual">カジュアル</SelectItem>
                          <SelectItem value="technical">技術的</SelectItem>
                          <SelectItem value="friendly">フレンドリー</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
          <Button onClick={onClose} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              '設定を保存'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AISettingsModal