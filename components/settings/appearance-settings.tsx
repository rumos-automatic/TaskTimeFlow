'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { useTheme } from 'next-themes'

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">外観設定</h3>
        <p className="text-sm text-muted-foreground">
          アプリケーションの見た目をカスタマイズします。
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="space-y-3">
          <Label>テーマ</Label>
          <RadioGroup value={theme} onValueChange={setTheme}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="font-normal cursor-pointer">
                ライト
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="font-normal cursor-pointer">
                ダーク
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="font-normal cursor-pointer">
                システム設定に従う
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="glass-effect">グラスモーフィズム効果</Label>
            <p className="text-sm text-muted-foreground">
              半透明のぼかし効果を有効にする
            </p>
          </div>
          <Switch id="glass-effect" defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="animations">アニメーション</Label>
            <p className="text-sm text-muted-foreground">
              画面遷移やインタラクションのアニメーション
            </p>
          </div>
          <Switch id="animations" defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="compact-mode">コンパクトモード</Label>
            <p className="text-sm text-muted-foreground">
              より多くの情報を画面に表示
            </p>
          </div>
          <Switch id="compact-mode" />
        </div>
      </Card>
    </div>
  )
}