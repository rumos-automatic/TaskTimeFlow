import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const { timeRange, format: exportFormat } = await request.json()
    
    // Get user session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user authentication 
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Define date range
    const endDate = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
        break
      case 'quarter':
        const quarter = Math.floor(endDate.getMonth() / 3)
        startDate = new Date(endDate.getFullYear(), quarter * 3, 1)
        break
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
    }

    // Fetch analytics data
    const [tasksData, pomodoroData, dailyStats] = await Promise.all([
      // Tasks data
      supabase
        .from('tasks')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // Pomodoro data from productivity analytics
      supabase
        .from('productivity_analytics')
        .select('date, pomodoro_sessions, pomodoro_completed, focus_time_minutes, break_time_minutes')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]),
      
      // Daily stats
      supabase
        .rpc('get_daily_productivity_stats', {
          user_uuid: user.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd')
        })
    ])

    if (exportFormat === 'csv') {
      return exportCSV(tasksData.data || [], pomodoroData.data || [], dailyStats.data || [])
    } else if (exportFormat === 'pdf') {
      return exportPDF(tasksData.data || [], pomodoroData.data || [], dailyStats.data || [], timeRange)
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

function exportCSV(tasks: any[], pomodoros: any[], dailyStats: any[]) {
  // Create CSV content
  let csv = 'データタイプ,日付,メトリック,値\n'
  
  // Add daily stats
  dailyStats.forEach(day => {
    csv += `日次統計,${day.date},タスク作成数,${day.tasks_created}\n`
    csv += `日次統計,${day.date},タスク完了数,${day.tasks_completed}\n`
    csv += `日次統計,${day.date},完了率,${day.completion_rate}\n`
    csv += `日次統計,${day.date},集中時間（分）,${day.focus_time}\n`
    csv += `日次統計,${day.date},ポモドーロセッション,${day.pomodoro_sessions}\n`
    csv += `日次統計,${day.date},効率スコア,${day.efficiency_score}\n`
  })

  // Add task summary
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const totalTasks = tasks.length
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  csv += `サマリー,期間全体,総タスク数,${totalTasks}\n`
  csv += `サマリー,期間全体,完了タスク数,${completedTasks}\n`
  csv += `サマリー,期間全体,完了率,${completionRate.toFixed(1)}\n`

  // Add pomodoro summary
  const completedPomodoros = pomodoros.filter(p => p.completed && p.session_type === 'work').length
  const totalFocusTime = pomodoros
    .filter(p => p.completed && p.session_type === 'work')
    .reduce((sum, p) => sum + p.actual_duration, 0)

  csv += `サマリー,期間全体,完了ポモドーロ,${completedPomodoros}\n`
  csv += `サマリー,期間全体,総集中時間（分）,${totalFocusTime}\n`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="productivity-report-${format(new Date(), 'yyyy-MM-dd')}.csv"`
    }
  })
}

function exportPDF(tasks: any[], pomodoros: any[], dailyStats: any[], timeRange: string) {
  // Simple HTML content for PDF generation
  // In a real implementation, you'd use a PDF library like Puppeteer or PDFKit
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>生産性レポート</title>
      <style>
        body { font-family: 'Noto Sans CJK JP', sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .metric { margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>TaskTimeFlow 生産性レポート</h1>
        <p>期間: ${timeRange === 'week' ? '今週' : timeRange === 'month' ? '今月' : timeRange === 'quarter' ? '四半期' : '今年'}</p>
        <p>生成日: ${format(new Date(), 'yyyy年MM月dd日')}</p>
      </div>

      <div class="section">
        <h2>サマリー</h2>
        <div class="metric">総タスク数: ${tasks.length}</div>
        <div class="metric">完了タスク数: ${tasks.filter(t => t.status === 'completed').length}</div>
        <div class="metric">完了率: ${tasks.length > 0 ? ((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100).toFixed(1) : 0}%</div>
        <div class="metric">完了ポモドーロ: ${pomodoros.filter(p => p.completed && p.session_type === 'work').length}</div>
        <div class="metric">総集中時間: ${Math.round(pomodoros.filter(p => p.completed && p.session_type === 'work').reduce((sum, p) => sum + p.actual_duration, 0) / 60)}時間</div>
      </div>

      <div class="section">
        <h2>日次データ</h2>
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>作成</th>
              <th>完了</th>
              <th>完了率</th>
              <th>集中時間</th>
              <th>ポモドーロ</th>
            </tr>
          </thead>
          <tbody>
            ${dailyStats.map(day => `
              <tr>
                <td>${day.date}</td>
                <td>${day.tasks_created}</td>
                <td>${day.tasks_completed}</td>
                <td>${day.completion_rate.toFixed(1)}%</td>
                <td>${Math.round(day.focus_time / 60)}h</td>
                <td>${day.pomodoro_sessions}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>パフォーマンス分析</h2>
        <p>このレポートは TaskTimeFlow によって自動生成されました。継続的な改善にご活用ください。</p>
      </div>
    </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="productivity-report-${format(new Date(), 'yyyy-MM-dd')}.html"`
    }
  })
}