'use client'

import { useState } from 'react'
import { useTimerStore } from '@/lib/store/use-timer-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Settings, 
  Clock, 
  Bell, 
  Zap, 
  Palette,
  Volume2,
  VolumeX,
  Play,
  Pause
} from 'lucide-react'

interface TimerSettingsProps {
  children: React.ReactNode
}

export function TimerSettings({ children }: TimerSettingsProps) {
  const [open, setOpen] = useState(false)
  const {
    // Basic timer settings
    pomodoroTime,
    breakTime,
    longBreakTime,
    longBreakInterval,
    
    // Notification settings
    soundEnabled,
    notificationEnabled,
    customNotificationMessage,
    
    // Automation settings
    autoStartBreaks,
    autoStartPomodoros,
    
    // Display settings
    timerColor,
    displayMode,
    
    updateTimerSettings
  } = useTimerStore()

  const handleTimeChange = (type: 'pomodoro' | 'break' | 'longBreak', value: number[]) => {
    const newValue = value[0]
    updateTimerSettings({
      ...(type === 'pomodoro' && { pomodoroTime: newValue }),
      ...(type === 'break' && { breakTime: newValue }),
      ...(type === 'longBreak' && { longBreakTime: newValue })
    })
  }

  const handleNotificationMessageChange = (type: 'pomodoroComplete' | 'breakComplete', value: string) => {
    updateTimerSettings({
      customNotificationMessage: {
        ...customNotificationMessage,
        [type]: value
      }
    })
  }

  const predefinedTimes = {
    pomodoro: [15, 20, 25, 30, 45, 50, 60],
    break: [3, 5, 10, 15],
    longBreak: [10, 15, 20, 25, 30]
  }

  const colorOptions = [
    { value: 'orange', label: 'オレンジ', class: 'text-orange-500' },
    { value: 'blue', label: 'ブルー', class: 'text-blue-500' },
    { value: 'green', label: 'グリーン', class: 'text-green-500' },
    { value: 'purple', label: 'パープル', class: 'text-purple-500' },
    { value: 'red', label: 'レッド', class: 'text-red-500' },
    { value: 'pink', label: 'ピンク', class: 'text-pink-500' }
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            ポモドーロタイマー設定
          </DialogTitle>
          <DialogDescription>
            あなたの作業スタイルに合わせてタイマーをカスタマイズできます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ⏰ 時間設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4" />
                時間設定
              </CardTitle>
              <CardDescription>
                作業時間と休憩時間を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ポモドーロ時間 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>作業時間（ポモドーロ）</Label>
                  <span className="text-sm font-medium">{pomodoroTime}分</span>
                </div>
                <Slider
                  value={[pomodoroTime]}
                  onValueChange={(value) => handleTimeChange('pomodoro', value)}
                  max={60}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <div className="flex gap-1 flex-wrap">
                  {predefinedTimes.pomodoro.map((time) => (
                    <Button
                      key={time}
                      variant={pomodoroTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTimerSettings({ pomodoroTime: time })}
                      className="text-xs"
                    >
                      {time}分
                    </Button>
                  ))}
                </div>
              </div>

              {/* 短い休憩時間 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>短い休憩時間</Label>
                  <span className="text-sm font-medium">{breakTime}分</span>
                </div>
                <Slider
                  value={[breakTime]}
                  onValueChange={(value) => handleTimeChange('break', value)}
                  max={30}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex gap-1 flex-wrap">
                  {predefinedTimes.break.map((time) => (
                    <Button
                      key={time}
                      variant={breakTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTimerSettings({ breakTime: time })}
                      className="text-xs"
                    >
                      {time}分
                    </Button>
                  ))}
                </div>
              </div>

              {/* 長い休憩時間 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>長い休憩時間</Label>
                  <span className="text-sm font-medium">{longBreakTime}分</span>
                </div>
                <Slider
                  value={[longBreakTime]}
                  onValueChange={(value) => handleTimeChange('longBreak', value)}
                  max={60}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <div className="flex gap-1 flex-wrap">
                  {predefinedTimes.longBreak.map((time) => (
                    <Button
                      key={time}
                      variant={longBreakTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTimerSettings({ longBreakTime: time })}
                      className="text-xs"
                    >
                      {time}分
                    </Button>
                  ))}
                </div>
              </div>

              {/* 長い休憩の間隔 */}
              <div className="space-y-2">
                <Label>長い休憩の間隔</Label>
                <Select
                  value={longBreakInterval.toString()}
                  onValueChange={(value) => updateTimerSettings({ longBreakInterval: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2ポモドーロ毎</SelectItem>
                    <SelectItem value="3">3ポモドーロ毎</SelectItem>
                    <SelectItem value="4">4ポモドーロ毎</SelectItem>
                    <SelectItem value="5">5ポモドーロ毎</SelectItem>
                    <SelectItem value="6">6ポモドーロ毎</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 🔔 通知設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-4 h-4" />
                通知設定
              </CardTitle>
              <CardDescription>
                タイマー完了時の通知を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>ブラウザ通知</Label>
                  <p className="text-sm text-muted-foreground">タイマー完了時にブラウザ通知を表示</p>
                </div>
                <Switch
                  checked={notificationEnabled}
                  onCheckedChange={(checked) => updateTimerSettings({ notificationEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    通知音
                  </Label>
                  <p className="text-sm text-muted-foreground">タイマー完了時に音で通知</p>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={(checked) => updateTimerSettings({ soundEnabled: checked })}
                />
              </div>

              {notificationEnabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>ポモドーロ完了時のメッセージ</Label>
                    <Input
                      value={customNotificationMessage.pomodoroComplete}
                      onChange={(e) => handleNotificationMessageChange('pomodoroComplete', e.target.value)}
                      placeholder="ポモドーロ完了時のメッセージ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>休憩完了時のメッセージ</Label>
                    <Input
                      value={customNotificationMessage.breakComplete}
                      onChange={(e) => handleNotificationMessageChange('breakComplete', e.target.value)}
                      placeholder="休憩完了時のメッセージ"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 🚀 自動化設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4" />
                自動化設定
              </CardTitle>
              <CardDescription>
                タイマーの自動開始を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Pause className="w-4 h-4" />
                    休憩自動開始
                  </Label>
                  <p className="text-sm text-muted-foreground">ポモドーロ完了後に自動で休憩を開始</p>
                </div>
                <Switch
                  checked={autoStartBreaks}
                  onCheckedChange={(checked) => updateTimerSettings({ autoStartBreaks: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    作業自動開始
                  </Label>
                  <p className="text-sm text-muted-foreground">休憩完了後に自動で次のポモドーロを開始</p>
                </div>
                <Switch
                  checked={autoStartPomodoros}
                  onCheckedChange={(checked) => updateTimerSettings({ autoStartPomodoros: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 🎨 表示設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="w-4 h-4" />
                表示設定
              </CardTitle>
              <CardDescription>
                タイマーの見た目をカスタマイズします
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>プログレスリングの色</Label>
                <div className="grid grid-cols-3 gap-2">
                  {colorOptions.map((color) => (
                    <Button
                      key={color.value}
                      variant={timerColor === color.value ? "default" : "outline"}
                      onClick={() => updateTimerSettings({ timerColor: color.value })}
                      className="justify-start"
                    >
                      <div className={`w-3 h-3 rounded-full mr-2 ${color.class.replace('text-', 'bg-')}`} />
                      {color.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>時間表示モード</Label>
                <Select
                  value={displayMode}
                  onValueChange={(value: 'digital' | 'analog') => updateTimerSettings({ displayMode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digital">デジタル表示</SelectItem>
                    <SelectItem value="analog">アナログ風表示</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={() => setOpen(false)}>
            設定を保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}