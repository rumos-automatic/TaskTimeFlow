'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  BarChart3, 
  Target, 
  Brain, 
  Smartphone,
  ArrowRight,
  CheckCircle,
  Timer,
  Kanban
} from 'lucide-react'
import { usePWAInstall } from '@/components/pwa/ServiceWorkerRegistration'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { isInstallable, install } = usePWAInstall()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  const features = [
    {
      icon: Kanban,
      title: 'かんばんボード',
      description: 'ドラッグ&ドロップでタスクを管理',
      color: 'bg-blue-500'
    },
    {
      icon: Calendar,
      title: '24時間タイムライン',
      description: '時間軸でタスクをスケジューリング',
      color: 'bg-green-500'
    },
    {
      icon: Timer,
      title: 'ポモドーロタイマー',
      description: '集中力を高める時間管理',
      color: 'bg-red-500'
    },
    {
      icon: Brain,
      title: 'AI支援',
      description: 'タスク分析と最適化提案',
      color: 'bg-purple-500'
    },
    {
      icon: BarChart3,
      title: '分析・レポート',
      description: '生産性の可視化',
      color: 'bg-orange-500'
    },
    {
      icon: Target,
      title: 'Google連携',
      description: 'カレンダーとタスクの同期',
      color: 'bg-yellow-500'
    }
  ]

  const benefits = [
    'タスクの可視化と優先順位付け',
    '時間の有効活用とスケジュール管理', 
    '集中力向上と作業効率アップ',
    'データに基づく生産性改善',
    'チームコラボレーション機能',
    'マルチデバイス対応'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TaskTimeFlow
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            {isInstallable && (
              <Button variant="outline" size="sm" onClick={install}>
                <Smartphone className="h-4 w-4 mr-2" />
                アプリ化
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push('/login')}>
              ログイン
            </Button>
            <Button onClick={() => router.push('/auth/signup')}>
              無料で始める
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6">
            🚀 新機能: AI支援タスク分析
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              革新的な
            </span>
            <br />
            生産性向上SaaS
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            かんばん方式とタイムラインを統合し、ポモドーロタイマーとAI支援で
            あなたの生産性を最大化します
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => router.push('/auth/signup')} className="text-lg px-8">
              無料で始める
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/demo')}>
              デモを見る
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            クレジットカード不要 • 即座に利用開始
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              すべてが統合された
              <span className="text-blue-600">オールインワン</span>
              ソリューション
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              散らばったツールを一つに。TaskTimeFlowで生産性を革命的に向上させましょう。
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50">
                  <CardHeader>
                    <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-600">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              なぜ<span className="text-purple-600">TaskTimeFlow</span>を選ぶのか？
            </h2>
            <p className="text-gray-600 text-lg">
              数千人のユーザーが生産性向上を実感している理由
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3 p-4 rounded-lg bg-white shadow-sm border">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            今すぐ生産性を向上させましょう
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            TaskTimeFlowで、より効率的で充実した働き方を実現してください。
            無料プランで今すぐ始められます。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => router.push('/auth/signup')} className="text-lg px-8">
              無料アカウント作成
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              詳細を見る
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TaskTimeFlow
            </span>
          </div>
          <p className="text-gray-600 text-sm">
            © 2024 TaskTimeFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}