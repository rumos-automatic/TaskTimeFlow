'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { 
  Settings, 
  Grid3X3, 
  Eye, 
  EyeOff,
  Clock,
  Zap,
  Filter,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScheduleOptimizer } from '@/components/ai/ScheduleOptimizer'
import type { TimelineSettings } from '@/types/timeline'
import type { Task } from '@/types/tasks'

interface TimelineControlsProps {
  date: Date
  settings: TimelineSettings
  onSettingsChange: (settings: Partial<TimelineSettings>) => void
  tasks?: Task[]
  onScheduleApply?: (schedule: any) => void
}

export function TimelineControls({ date, settings, onSettingsChange, tasks = [], onScheduleApply }: TimelineControlsProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [showOptimizer, setShowOptimizer] = useState(false)

  const handleSettingChange = (key: keyof TimelineSettings, value: any) => {
    onSettingsChange({ [key]: value })
  }

  const handleWorkingHoursChange = (type: 'start' | 'end', value: number) => {
    onSettingsChange({
      working_hours: {
        ...settings.working_hours,
        [type]: value
      }
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
  }

  const getViewModeLabel = () => {
    if (settings.compact_view) return 'コンパクト表示'
    return '詳細表示'
  }

  const getGridIntervalLabel = () => {
    switch (settings.grid_interval) {
      case 15: return '15分'
      case 30: return '30分'
      case 60: return '60分'
      default: return '30分'
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
      {/* Left side - Date info and quick stats */}
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-600">
          {formatDate(date)}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {settings.working_hours.start}:00 - {settings.working_hours.end}:00
          </Badge>
          
          {settings.show_energy_levels && (
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              エネルギー表示
            </Badge>
          )}
        </div>
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center space-x-2">
        {/* Quick toggles */}
        <div className="flex items-center space-x-2">
          <Button
            variant={settings.show_time_blocks ? "default" : "outline"}
            size="sm"
            onClick={() => handleSettingChange('show_time_blocks', !settings.show_time_blocks)}
          >
            {settings.show_time_blocks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">ブロック</span>
          </Button>

          <Button
            variant={settings.show_energy_levels ? "default" : "outline"}
            size="sm"
            onClick={() => handleSettingChange('show_energy_levels', !settings.show_energy_levels)}
          >
            <Zap className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">エネルギー</span>
          </Button>

          <Button
            variant={settings.compact_view ? "default" : "outline"}
            size="sm"
            onClick={() => handleSettingChange('compact_view', !settings.compact_view)}
          >
            <Grid3X3 className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">コンパクト</span>
          </Button>
        </div>

        {/* Auto Schedule */}
        <Button
          variant="outline"
          size="sm"
          disabled={tasks.length === 0}
          onClick={() => setShowOptimizer(true)}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI最適化
        </Button>

        {/* Settings popover */}
        <Popover open={showSettings} onOpenChange={setShowSettings}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="font-medium text-sm">タイムライン設定</div>
              
              {/* Display Settings */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">表示設定</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="time-format" className="text-sm">時刻形式</Label>
                    <Select
                      value={settings.time_format}
                      onValueChange={(value: '12' | '24') => handleSettingChange('time_format', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24時間</SelectItem>
                        <SelectItem value="12">12時間</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="grid-interval" className="text-sm">グリッド間隔</Label>
                    <Select
                      value={settings.grid_interval.toString()}
                      onValueChange={(value) => handleSettingChange('grid_interval', parseInt(value))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15分</SelectItem>
                        <SelectItem value="30">30分</SelectItem>
                        <SelectItem value="60">60分</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="snap-to-grid" className="text-sm">グリッドスナップ</Label>
                    <Switch
                      id="snap-to-grid"
                      checked={settings.snap_to_grid}
                      onCheckedChange={(checked) => handleSettingChange('snap_to_grid', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-completed" className="text-sm">完了タスク表示</Label>
                    <Switch
                      id="show-completed"
                      checked={settings.show_completed_tasks}
                      onCheckedChange={(checked) => handleSettingChange('show_completed_tasks', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">作業時間</Label>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="work-start" className="text-xs text-gray-600">開始時刻</Label>
                    <Select
                      value={settings.working_hours.start.toString()}
                      onValueChange={(value) => handleWorkingHoursChange('start', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(24)].map((_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="work-end" className="text-xs text-gray-600">終了時刻</Label>
                    <Select
                      value={settings.working_hours.end.toString()}
                      onValueChange={(value) => handleWorkingHoursChange('end', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(24)].map((_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {(i + 1).toString().padStart(2, '0')}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Automation Settings */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">自動化設定</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-schedule" className="text-sm">自動スケジュール</Label>
                    <Switch
                      id="auto-schedule"
                      checked={settings.auto_schedule}
                      onCheckedChange={(checked) => handleSettingChange('auto_schedule', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="default-duration" className="text-sm">デフォルト時間（分）</Label>
                    <Select
                      value={settings.default_task_duration.toString()}
                      onValueChange={(value) => handleSettingChange('default_task_duration', parseInt(value))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15分</SelectItem>
                        <SelectItem value="30">30分</SelectItem>
                        <SelectItem value="60">60分</SelectItem>
                        <SelectItem value="90">90分</SelectItem>
                        <SelectItem value="120">120分</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Pomodoro Settings */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">ポモドーロ設定</Label>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="focus-duration" className="text-xs text-gray-600">集中時間</Label>
                    <Select
                      value={settings.focus_session_duration.toString()}
                      onValueChange={(value) => handleSettingChange('focus_session_duration', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25分</SelectItem>
                        <SelectItem value="30">30分</SelectItem>
                        <SelectItem value="45">45分</SelectItem>
                        <SelectItem value="60">60分</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="break-duration" className="text-xs text-gray-600">休憩時間</Label>
                    <Select
                      value={settings.break_duration.toString()}
                      onValueChange={(value) => handleSettingChange('break_duration', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5分</SelectItem>
                        <SelectItem value="10">10分</SelectItem>
                        <SelectItem value="15">15分</SelectItem>
                        <SelectItem value="20">20分</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Schedule Optimizer Modal */}
      <ScheduleOptimizer
        isOpen={showOptimizer}
        onClose={() => setShowOptimizer(false)}
        tasks={tasks}
        date={date}
        onOptimizedScheduleAccept={(schedule) => {
          onScheduleApply?.(schedule)
          setShowOptimizer(false)
        }}
      />
    </div>
  )
}

export default TimelineControls