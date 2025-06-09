'use client'

import { useAuth } from '@/hooks/useAuth'
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">ダッシュボード</h1>
        <p className="text-gray-600">TaskTimeFlowダッシュボードへようこそ！</p>
        
        {/* Placeholder content - will be replaced with actual dashboard components */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">今日のタスク</h2>
            <p className="text-gray-600">タスク管理機能を準備中...</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">進行中のプロジェクト</h2>
            <p className="text-gray-600">プロジェクト機能を準備中...</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">生産性分析</h2>
            <p className="text-gray-600">分析機能を準備中...</p>
          </div>
        </div>
      </div>
    </div>
  )
}