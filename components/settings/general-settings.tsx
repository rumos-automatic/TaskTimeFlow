'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/lib/auth/auth-context'
import { useUserSettings } from '@/lib/hooks/use-user-settings'

export function GeneralSettings() {
  const { user } = useAuth()
  const { settings, updateSettings, loading } = useUserSettings()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">一般設定</h3>
        <p className="text-sm text-muted-foreground">
          プロフィール情報と基本設定を管理します。
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input 
            id="email" 
            type="email" 
            value={user?.email || ''} 
            disabled 
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            メールアドレスは変更できません
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display-name">表示名</Label>
          <Input 
            id="display-name" 
            placeholder="表示名を入力" 
            defaultValue={user?.user_metadata?.full_name || ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">タイムゾーン</Label>
          <Select defaultValue="Asia/Tokyo">
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Asia/Tokyo">日本 (GMT+9)</SelectItem>
              <SelectItem value="America/New_York">ニューヨーク (EST)</SelectItem>
              <SelectItem value="America/Los_Angeles">ロサンゼルス (PST)</SelectItem>
              <SelectItem value="Europe/London">ロンドン (GMT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">言語</Label>
          <Select defaultValue="ja">
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h4 className="font-medium">タスク表示設定</h4>
        
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="show-scheduled-tasks">スケジュール済みタスクの表示</Label>
            <p className="text-sm text-muted-foreground">
              タイムラインに配置したタスクをタスクプールにも表示します
            </p>
          </div>
          <Switch
            id="show-scheduled-tasks"
            checked={settings.showScheduledTasksInPool}
            onCheckedChange={(checked) => updateSettings({ showScheduledTasksInPool: checked })}
            disabled={loading}
          />
        </div>
      </Card>
    </div>
  )
}