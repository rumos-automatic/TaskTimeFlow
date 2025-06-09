'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Play, 
  Calendar, 
  Clock, 
  BarChart3, 
  Target, 
  Brain, 
  Kanban,
  Timer
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DemoPage() {
  const router = useRouter()

  const demoFeatures = [
    {
      icon: Kanban,
      title: 'かんばんボード',
      description: 'ドラッグ&ドロップでタスクを直感的に管理',
      status: 'available',
      color: 'bg-blue-500'
    },
    {
      icon: Calendar,
      title: '24時間タイムライン',
      description: '時間軸でタスクをスケジューリング',
      status: 'available',
      color: 'bg-green-500'
    },
    {
      icon: Timer,
      title: 'ポモドーロタイマー',
      description: '集中力を高める時間管理システム',
      status: 'available',
      color: 'bg-red-500'
    },
    {
      icon: Brain,
      title: 'AI支援',
      description: 'タスク分析と最適化提案',
      status: 'coming-soon',
      color: 'bg-purple-500'
    },
    {
      icon: BarChart3,
      title: '分析・レポート',
      description: '生産性の可視化と改善提案',
      status: 'coming-soon',
      color: 'bg-orange-500'
    },
    {
      icon: Target,
      title: 'Google連携',
      description: 'カレンダーとタスクの同期',
      status: 'coming-soon',
      color: 'bg-yellow-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TaskTimeFlow Demo
            </span>
          </div>
          
          <Button onClick={() => router.push('/auth/signup')}>
            無料で始める
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6">
            <Play className="h-3 w-3 mr-1" />
            インタラクティブデモ
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TaskTimeFlow
            </span>
            <br />
            の機能を体験
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            実際の機能を体験して、TaskTimeFlowがあなたの生産性をどのように向上させるかご確認ください。
          </p>
        </div>
      </section>

      {/* Demo Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              主要機能のデモ
            </h2>
            <p className="text-gray-600 text-lg">
              各機能をクリックして詳細をご覧ください
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {demoFeatures.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <Card 
                  key={index} 
                  className={`group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 cursor-pointer ${
                    feature.status === 'coming-soon' ? 'opacity-70' : ''
                  }`}
                  onClick={() => {
                    if (feature.status === 'available') {
                      // Placeholder for demo functionality
                      alert(`${feature.title}のデモを準備中です`)
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      {feature.status === 'coming-soon' && (
                        <Badge variant="secondary" className="text-xs">
                          近日公開
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-600">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  {feature.status === 'available' && (
                    <CardContent>
                      <Button variant="outline" size="sm" className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        デモを試す
                      </Button>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Interactive Demo Placeholder */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">インタラクティブプレビュー</h2>
            <p className="text-gray-600">
              実際のアプリケーションと同じUIで操作を体験できます
            </p>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg mx-auto flex items-center justify-center mb-4">
                <Play className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">デモ環境を準備中</h3>
              <p className="text-gray-600 mb-6">
                インタラクティブなデモ環境を構築中です。<br />
                完成次第、こちらで実際の操作をお試しいただけます。
              </p>
            </div>
            
            <Button onClick={() => router.push('/auth/signup')} size="lg">
              今すぐ無料で始める
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            準備はできましたか？
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            TaskTimeFlowの全機能を無料でお試しいただけます。
            今すぐアカウントを作成して、生産性向上の旅を始めましょう。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => router.push('/auth/signup')} className="text-lg px-8">
              無料アカウント作成
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600" onClick={() => router.back()}>
              ホームに戻る
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}