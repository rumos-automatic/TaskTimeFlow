'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Bot, Send } from 'lucide-react'

interface AIChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIChatDialog({ open, onOpenChange }: AIChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-primary" />
            <span>AI アシスタント</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4">
          <div className="bg-muted/30 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">開発中です</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                AI チャット機能は現在開発中です。タスクの自動作成やスクリーンショット解析機能を準備しています。
              </p>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  今後のアップデートをお楽しみに！
                </p>
              </div>
            </div>
          </div>
          
          <div className="opacity-30 pointer-events-none">
            <div className="flex items-end space-x-2">
              <input 
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                placeholder="タスクについて質問してください..."
                disabled
              />
              <Button size="sm" disabled>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}