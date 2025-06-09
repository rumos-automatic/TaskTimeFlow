'use client'

import { useState, useEffect } from 'react'
import { useAIAssistant } from '@/hooks/useAI'
import { useTimelineSlots } from '@/hooks/useTimeline'
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
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Target,
  Clock,
  Zap,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Calendar,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTaskDuration } from '@/lib/tasks'
import type { Task } from '@/types/tasks'
import type { 
  ScheduleOptimizationResponse, 
  OptimizationGoal,
  SchedulingConstraints,
  SchedulingPreferences,
  OptimizedTimelineSlot,
  ScheduleImprovement 
} from '@/types/ai'

interface ScheduleOptimizerProps {
  isOpen: boolean
  onClose: () => void
  tasks: Task[]
  date: Date
  onOptimizedScheduleAccept?: (slots: OptimizedTimelineSlot[]) => void
}

interface OptimizationSettings {
  constraints: SchedulingConstraints
  preferences: SchedulingPreferences
  goals: OptimizationGoal[]
}

export function ScheduleOptimizer({ 
  isOpen, 
  onClose, 
  tasks, 
  date,
  onOptimizedScheduleAccept 
}: ScheduleOptimizerProps) {
  const [optimization, setOptimization] = useState<ScheduleOptimizationResponse | null>(null)
  const [settings, setSettings] = useState<OptimizationSettings>({
    constraints: {
      working_hours: { start: "09:00", end: "17:00" },
      break_duration: 15,
      max_consecutive_work: 120,
      blocked_times: [],
      energy_levels: { high: ["09:00-11:00"], low: ["14:00-15:00"] },
      mandatory_breaks: true,
      weekend_work: false
    },
    preferences: {
      prefer_morning: false,
      prefer_afternoon: false,
      prefer_evening: false,
      batch_similar_tasks: true,
      minimize_context_switching: true,
      respect_deadlines: true,
      optimize_for_energy: true,
      allow_overtime: false,
      buffer_time_percentage: 10
    },
    goals: [
      { type: 'maximize_productivity', weight: 0.5 },
      { type: 'balance_energy', weight: 0.3 },
      { type: 'minimize_stress', weight: 0.2 }
    ]
  })
  const [activeTab, setActiveTab] = useState('settings')
  
  const { performScheduleOptimization, isProcessing, currentOperation } = useAIAssistant()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOptimization(null)
      setActiveTab('settings')
    }
  }, [isOpen])

  const handleOptimization = async () => {
    try {
      const result = await performScheduleOptimization(tasks, {
        constraints: settings.constraints,
        preferences: settings.preferences,
        optimization_goals: settings.goals,
        time_blocks: [] // This would be populated from user's time blocks
      })
      setOptimization(result)
      setActiveTab('results')
    } catch (error) {
      console.error('Schedule optimization failed:', error)
    }
  }

  const handleSettingChange = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.')
      const newSettings = { ...prev }
      let current: any = newSettings
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newSettings
    })
  }

  const handleGoalWeightChange = (goalType: string, weight: number) => {
    setSettings(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.type === goalType ? { ...goal, weight: weight / 100 } : goal
      )
    }))
  }

  const getMetricColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getImprovementIcon = (type: string) => {
    switch (type) {
      case 'efficiency': return <TrendingUp className="h-4 w-4" />
      case 'energy_alignment': return <Zap className="h-4 w-4" />
      case 'context_optimization': return <Target className="h-4 w-4" />
      default: return <BarChart3 className="h-4 w-4" />
    }
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-500" />
            <span>AIスケジュール最適化</span>
          </DialogTitle>
          <DialogDescription>
            AIが{tasks.length}個のタスクを最適なスケジュールに配置します
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings">最適化設定</TabsTrigger>
              <TabsTrigger value="processing" disabled={!isProcessing}>
                処理中
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!optimization}>
                結果
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="settings" className="space-y-4 mt-4">
                {/* Task Overview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">対象タスク</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">タスク数:</span>
                          <span className="ml-2 font-medium">{tasks.length}個</span>
                        </div>
                        <div>
                          <span className="text-gray-500">推定合計時間:</span>
                          <span className="ml-2 font-medium">
                            {formatTaskDuration(
                              tasks.reduce((sum, task) => sum + (task.estimated_duration || 30), 0)
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">日付:</span>
                          <span className="ml-2 font-medium">
                            {date.toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Constraints */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">制約条件</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">作業開始時刻</Label>
                        <div className="mt-2">
                          <Slider
                            value={[parseInt(settings.constraints.working_hours.start.split(':')[0])]}
                            onValueChange={([value]) => 
                              handleSettingChange('constraints.working_hours.start', `${value.toString().padStart(2, '0')}:00`)
                            }
                            max={23}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                          <div className="text-sm text-gray-500 mt-1">
                            {settings.constraints.working_hours.start}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm">作業終了時刻</Label>
                        <div className="mt-2">
                          <Slider
                            value={[parseInt(settings.constraints.working_hours.end.split(':')[0])]}
                            onValueChange={([value]) => 
                              handleSettingChange('constraints.working_hours.end', `${value.toString().padStart(2, '0')}:00`)
                            }
                            max={23}
                            min={1}
                            step={1}
                            className="w-full"
                          />
                          <div className="text-sm text-gray-500 mt-1">
                            {settings.constraints.working_hours.end}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">休憩時間 (分)</Label>
                        <div className="mt-2">
                          <Slider
                            value={[settings.constraints.break_duration]}
                            onValueChange={([value]) => 
                              handleSettingChange('constraints.break_duration', value)
                            }
                            max={60}
                            min={5}
                            step={5}
                            className="w-full"
                          />
                          <div className="text-sm text-gray-500 mt-1">
                            {settings.constraints.break_duration}分
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm">最大連続作業時間 (分)</Label>
                        <div className="mt-2">
                          <Slider
                            value={[settings.constraints.max_consecutive_work]}
                            onValueChange={([value]) => 
                              handleSettingChange('constraints.max_consecutive_work', value)
                            }
                            max={240}
                            min={15}
                            step={15}
                            className="w-full"
                          />
                          <div className="text-sm text-gray-500 mt-1">
                            {settings.constraints.max_consecutive_work}分
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">必須休憩時間</Label>
                        <Switch
                          checked={settings.constraints.mandatory_breaks}
                          onCheckedChange={(checked) => 
                            handleSettingChange('constraints.mandatory_breaks', checked)
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">週末作業を許可</Label>
                        <Switch
                          checked={settings.constraints.weekend_work}
                          onCheckedChange={(checked) => 
                            handleSettingChange('constraints.weekend_work', checked)
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">設定</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">午前を優先</Label>
                      <Switch
                        checked={settings.preferences.prefer_morning}
                        onCheckedChange={(checked) => 
                          handleSettingChange('preferences.prefer_morning', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">午後を優先</Label>
                      <Switch
                        checked={settings.preferences.prefer_afternoon}
                        onCheckedChange={(checked) => 
                          handleSettingChange('preferences.prefer_afternoon', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">類似タスクをグループ化</Label>
                      <Switch
                        checked={settings.preferences.batch_similar_tasks}
                        onCheckedChange={(checked) => 
                          handleSettingChange('preferences.batch_similar_tasks', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">コンテキスト切り替えを最小化</Label>
                      <Switch
                        checked={settings.preferences.minimize_context_switching}
                        onCheckedChange={(checked) => 
                          handleSettingChange('preferences.minimize_context_switching', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">締切を尊重</Label>
                      <Switch
                        checked={settings.preferences.respect_deadlines}
                        onCheckedChange={(checked) => 
                          handleSettingChange('preferences.respect_deadlines', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">エネルギーレベルで最適化</Label>
                      <Switch
                        checked={settings.preferences.optimize_for_energy}
                        onCheckedChange={(checked) => 
                          handleSettingChange('preferences.optimize_for_energy', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">残業を許可</Label>
                      <Switch
                        checked={settings.preferences.allow_overtime}
                        onCheckedChange={(checked) => 
                          handleSettingChange('preferences.allow_overtime', checked)
                        }
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm">バッファ時間 (%)</Label>
                      <div className="mt-2">
                        <Slider
                          value={[settings.preferences.buffer_time_percentage]}
                          onValueChange={([value]) => 
                            handleSettingChange('preferences.buffer_time_percentage', value)
                          }
                          max={50}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500 mt-1">
                          {settings.preferences.buffer_time_percentage}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Optimization Goals */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">最適化目標</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {settings.goals.map((goal, index) => (
                      <div key={goal.type}>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm">
                            {goal.type === 'maximize_productivity' ? '生産性最大化' :
                             goal.type === 'balance_energy' ? 'エネルギーバランス' :
                             goal.type === 'minimize_stress' ? 'ストレス最小化' :
                             goal.type === 'reduce_context_switching' ? 'コンテキスト切り替え削減' : goal.type}
                          </Label>
                          <span className="text-sm text-gray-500">
                            {Math.round(goal.weight * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[goal.weight * 100]}
                          onValueChange={([value]) => handleGoalWeightChange(goal.type, value)}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="processing" className="mt-4">
                <div className="text-center py-12">
                  <div className="space-y-4">
                    <Loader2 className="h-16 w-16 mx-auto animate-spin text-blue-500" />
                    <div>
                      <p className="text-lg font-medium">{currentOperation}</p>
                      <p className="text-sm text-gray-500">
                        AIが最適なスケジュールを計算しています...
                      </p>
                    </div>
                    <Progress value={75} className="max-w-sm mx-auto" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="results" className="space-y-4 mt-4">
                {optimization && (
                  <>
                    {/* Metrics Overview */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">最適化結果</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className={cn(
                              'text-2xl font-bold p-2 rounded',
                              getMetricColor(optimization.metrics.total_efficiency_score)
                            )}>
                              {optimization.metrics.total_efficiency_score}%
                            </div>
                            <p className="text-xs text-gray-600 mt-1">総合効率</p>
                          </div>
                          
                          <div className="text-center">
                            <div className={cn(
                              'text-2xl font-bold p-2 rounded',
                              getMetricColor(optimization.metrics.energy_alignment_score)
                            )}>
                              {optimization.metrics.energy_alignment_score}%
                            </div>
                            <p className="text-xs text-gray-600 mt-1">エネルギー整合</p>
                          </div>
                          
                          <div className="text-center">
                            <div className={cn(
                              'text-2xl font-bold p-2 rounded',
                              getMetricColor(optimization.metrics.productivity_index)
                            )}>
                              {optimization.metrics.productivity_index}%
                            </div>
                            <p className="text-xs text-gray-600 mt-1">生産性指数</p>
                          </div>
                        </div>

                        <div className="mt-4 text-sm text-gray-600">
                          <p>{optimization.reasoning}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Improvements */}
                    {optimization.improvements.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">改善点</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {optimization.improvements.map((improvement, index) => (
                              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className="text-blue-500 mt-0.5">
                                  {getImprovementIcon(improvement.type)}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{improvement.description}</h4>
                                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600">
                                    <div className="flex items-center space-x-1">
                                      <span>生産性向上:</span>
                                      <span className="font-medium text-green-600">
                                        +{improvement.impact.productivity_improvement}%
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <span>時間節約:</span>
                                      <span className="font-medium text-blue-600">
                                        {improvement.impact.time_saved}分
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <span>ストレス軽減:</span>
                                      <span className="font-medium text-purple-600">
                                        -{improvement.impact.stress_reduction}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Optimized Schedule */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">最適化されたスケジュール</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {optimization.optimized_schedule.map((slot, index) => {
                            const task = tasks.find(t => t.id === slot.task_id)
                            if (!task) return null

                            return (
                              <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                                <div className="text-sm font-mono text-gray-600">
                                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{task.title}</h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      信頼度 {slot.confidence}%
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      <Zap className="h-3 w-3 mr-1" />
                                      エネルギー {slot.energy_alignment}%
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      コンテキスト {slot.context_score}%
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          
          {!optimization && !isProcessing && (
            <Button onClick={handleOptimization}>
              <Sparkles className="mr-2 h-4 w-4" />
              最適化を実行
            </Button>
          )}
          
          {optimization && (
            <Button
              onClick={() => {
                onOptimizedScheduleAccept?.(optimization.optimized_schedule)
                onClose()
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              スケジュールを適用
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ScheduleOptimizer