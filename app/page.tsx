import { WorkspaceNew } from '@/components/workspace/workspace-new'
import { CategoryCleanup } from '@/components/debug/category-cleanup'
import { useAuth } from '@/lib/auth/auth-context'

export default function Home() {
  // TODO: 一時的なクリーンアップ表示（本番では削除）
  const showCleanup = typeof window !== 'undefined' && window.location.search.includes('cleanup=true')
  
  if (showCleanup) {
    return (
      <div className="min-h-screen bg-background p-8">
        <CategoryCleanup />
      </div>
    )
  }
  
  return <WorkspaceNew />
}