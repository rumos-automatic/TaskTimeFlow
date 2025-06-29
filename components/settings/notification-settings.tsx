'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">通知設定</h3>
        <p className="text-sm text-muted-foreground">
          通知の受け取り方法を設定します。
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="desktop-notifications">デスクトップ通知</Label>
            <p className="text-sm text-muted-foreground">
              タスクのリマインダーや完了通知を表示
            </p>
          </div>
          <Switch id="desktop-notifications" defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-notifications">サウンド通知</Label>
            <p className="text-sm text-muted-foreground">
              通知時に音を鳴らす
            </p>
          </div>
          <Switch id="sound-notifications" defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="break-reminders">休憩リマインダー</Label>
            <p className="text-sm text-muted-foreground">
              定期的な休憩を促す通知
            </p>
          </div>
          <Switch id="break-reminders" defaultChecked />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-digest">メールダイジェスト</Label>
          <Select defaultValue="daily">
            <SelectTrigger id="email-digest">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">送信しない</SelectItem>
              <SelectItem value="daily">毎日</SelectItem>
              <SelectItem value="weekly">週次</SelectItem>
              <SelectItem value="monthly">月次</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            タスクの進捗状況をメールで受け取る頻度
          </p>
        </div>
      </Card>
    </div>
  )
}