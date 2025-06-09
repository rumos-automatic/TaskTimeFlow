'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, subDays, format } from 'date-fns'

type TimeRange = 'week' | 'month' | 'quarter' | 'year'

interface ProductivityOverview {
  completion_rate: number
  completion_rate_change: number
  total_focus_time: number // minutes
  total_pomodoros: number
  efficiency_score: number
  tasks_completed: number
  tasks_created: number
}

interface DailyStat {
  date: string
  tasks_completed: number
  tasks_created: number
  completion_rate: number
  focus_time: number
  pomodoro_sessions: number
  efficiency_score: number
}

interface PomodoroStats {
  total_sessions: number
  completed_sessions: number
  average_focus_score: number
  average_session_duration: number
  best_streak: number
  current_streak: number
  daily_goal_achieved: boolean
  sessions_by_time: Array<{
    hour: number
    sessions: number
  }>
}

interface ProductivityTrend {
  metric: string
  current_value: number
  previous_value: number
  change_percentage: number
  trend_direction: 'up' | 'down' | 'stable'
}

interface TimeDistribution {
  category: string
  hours: number
  percentage: number
  color: string
}

interface Goal {
  id: string
  name: string
  target_value: number
  current_value: number
  progress_percentage: number
  deadline: string
  status: 'on_track' | 'behind' | 'completed'
}

interface ProductivityAnalytics {
  overview: ProductivityOverview
  daily_stats: DailyStat[]
  pomodoro_stats: PomodoroStats
  trends: ProductivityTrend[]
  time_distribution: TimeDistribution[]
  weekly_heatmap: Array<{
    date: string
    value: number
    level: number
  }>
  goals: Goal[]
}

export function useProductivityAnalytics(timeRange: TimeRange) {
  return useQuery<ProductivityAnalytics>({
    queryKey: ['productivity-analytics', timeRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { startDate, endDate } = getDateRange(timeRange)

      // Run all queries in parallel
      const [
        overview,
        dailyStats,
        pomodoroStats,
        timeDistribution,
        weeklyHeatmap,
        goals
      ] = await Promise.all([
        getProductivityOverview(user.id, startDate, endDate, timeRange),
        getDailyStats(user.id, startDate, endDate),
        getPomodoroStats(user.id, startDate, endDate),
        getTimeDistribution(user.id, startDate, endDate),
        getWeeklyHeatmap(user.id),
        getGoalsProgress(user.id)
      ])

      // Calculate trends
      const trends = calculateTrends(overview, timeRange)

      return {
        overview,
        daily_stats: dailyStats,
        pomodoro_stats: pomodoroStats,
        trends,
        time_distribution: timeDistribution,
        weekly_heatmap: weeklyHeatmap,
        goals
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10 // 10 minutes
  })
}

async function getProductivityOverview(
  userId: string, 
  startDate: Date, 
  endDate: Date,
  timeRange: TimeRange
): Promise<ProductivityOverview> {
  // Get task completion data
  const { data: taskStats } = await supabase
    .from('tasks')
    .select('status, created_at, completed_at, estimated_duration, actual_duration')
    .eq('created_by', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  // Get pomodoro data
  const { data: pomodoroStats } = await supabase
    .from('pomodoro_sessions')
    .select('actual_duration, completed, session_type')
    .eq('user_id', userId)
    .eq('session_type', 'work')
    .gte('started_at', startDate.toISOString())
    .lte('started_at', endDate.toISOString())

  const tasksCreated = taskStats?.length || 0
  const tasksCompleted = taskStats?.filter(t => t.status === 'completed').length || 0
  const completionRate = tasksCreated > 0 ? (tasksCompleted / tasksCreated) * 100 : 0

  const totalFocusTime = pomodoroStats?.reduce((sum, session) => 
    sum + (session.completed ? session.actual_duration : 0), 0) || 0

  const totalPomodoros = pomodoroStats?.filter(s => s.completed).length || 0

  // Calculate efficiency score (composite metric)
  const efficiencyScore = calculateEfficiencyScore(completionRate, totalFocusTime, totalPomodoros)

  // Get previous period data for comparison
  const previousPeriod = getPreviousPeriod(startDate, endDate, timeRange)
  const { data: previousTaskStats } = await supabase
    .from('tasks')
    .select('status')
    .eq('created_by', userId)
    .gte('created_at', previousPeriod.start.toISOString())
    .lte('created_at', previousPeriod.end.toISOString())

  const previousTasksCreated = previousTaskStats?.length || 0
  const previousTasksCompleted = previousTaskStats?.filter(t => t.status === 'completed').length || 0
  const previousCompletionRate = previousTasksCreated > 0 ? (previousTasksCompleted / previousTasksCreated) * 100 : 0
  const completionRateChange = completionRate - previousCompletionRate

  return {
    completion_rate: completionRate,
    completion_rate_change: completionRateChange,
    total_focus_time: totalFocusTime,
    total_pomodoros: totalPomodoros,
    efficiency_score: efficiencyScore,
    tasks_completed: tasksCompleted,
    tasks_created: tasksCreated
  }
}

async function getDailyStats(userId: string, startDate: Date, endDate: Date): Promise<DailyStat[]> {
  const { data: dailyData } = await supabase
    .rpc('get_daily_productivity_stats', {
      user_uuid: userId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    })

  return dailyData || []
}

async function getPomodoroStats(userId: string, startDate: Date, endDate: Date): Promise<PomodoroStats> {
  // Get pomodoro session data
  const { data: sessions } = await supabase
    .from('pomodoro_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', startDate.toISOString())
    .lte('started_at', endDate.toISOString())

  const totalSessions = sessions?.length || 0
  const completedSessions = sessions?.filter(s => s.completed).length || 0
  const workSessions = sessions?.filter(s => s.session_type === 'work') || []

  const averageFocusScore = workSessions.length > 0 
    ? workSessions.reduce((sum, s) => sum + (s.focus_score || 0), 0) / workSessions.length
    : 0

  const averageSessionDuration = completedSessions > 0
    ? sessions!.filter(s => s.completed).reduce((sum, s) => sum + s.actual_duration, 0) / completedSessions
    : 0

  // Get streak data
  const { data: streakData } = await supabase
    .from('pomodoro_stats')
    .select('streak_count, daily_goal, goal_achieved')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7)

  const currentStreak = streakData?.[0]?.streak_count || 0
  const bestStreak = Math.max(...(streakData?.map(d => d.streak_count) || [0]))
  const dailyGoalAchieved = streakData?.[0]?.goal_achieved || false

  // Sessions by hour
  const sessionsByTime = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    sessions: sessions?.filter(s => new Date(s.started_at).getHours() === hour).length || 0
  }))

  return {
    total_sessions: totalSessions,
    completed_sessions: completedSessions,
    average_focus_score: averageFocusScore,
    average_session_duration: averageSessionDuration,
    best_streak: bestStreak,
    current_streak: currentStreak,
    daily_goal_achieved: dailyGoalAchieved,
    sessions_by_time: sessionsByTime
  }
}

async function getTimeDistribution(userId: string, startDate: Date, endDate: Date): Promise<TimeDistribution[]> {
  // Get time spent on different categories
  const { data: taskTime } = await supabase
    .from('tasks')
    .select('labels, actual_duration')
    .eq('created_by', userId)
    .not('actual_duration', 'is', null)
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString())

  const { data: pomodoroTime } = await supabase
    .from('pomodoro_sessions')
    .select('actual_duration, session_type')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('started_at', startDate.toISOString())
    .lte('started_at', endDate.toISOString())

  // Group by categories
  const categories = new Map<string, number>()
  
  // Process task time by labels
  taskTime?.forEach(task => {
    const labels = task.labels || ['その他']
    const timePerLabel = task.actual_duration / labels.length
    
    labels.forEach(label => {
      categories.set(label, (categories.get(label) || 0) + timePerLabel)
    })
  })

  // Add pomodoro work time
  const pomodoroWorkTime = pomodoroTime?.filter(s => s.session_type === 'work')
    .reduce((sum, s) => sum + s.actual_duration, 0) || 0
  
  categories.set('ポモドーロ作業', pomodoroWorkTime)

  // Calculate percentages and format
  const totalTime = Array.from(categories.values()).reduce((sum, time) => sum + time, 0)
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

  return Array.from(categories.entries())
    .map(([category, minutes], index) => ({
      category,
      hours: minutes / 60,
      percentage: totalTime > 0 ? (minutes / totalTime) * 100 : 0,
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.hours - a.hours)
}

async function getWeeklyHeatmap(userId: string) {
  const endDate = new Date()
  const startDate = subDays(endDate, 364) // 1 year of data

  const { data: dailyStats } = await supabase
    .from('pomodoro_stats')
    .select('date, completed_sessions')
    .eq('user_id', userId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'))

  // Fill in missing dates and calculate levels
  const heatmapData = []
  let currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    const dayData = dailyStats?.find(d => d.date === dateStr)
    const sessions = dayData?.completed_sessions || 0
    
    // Calculate level (0-4) based on session count
    let level = 0
    if (sessions >= 1) level = 1
    if (sessions >= 4) level = 2
    if (sessions >= 8) level = 3
    if (sessions >= 12) level = 4

    heatmapData.push({
      date: dateStr,
      value: sessions,
      level
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return heatmapData
}

async function getGoalsProgress(userId: string): Promise<Goal[]> {
  // This would typically come from a goals table
  // For now, we'll return some example goals
  return [
    {
      id: '1',
      name: '月間100ポモドーロ達成',
      target_value: 100,
      current_value: 67,
      progress_percentage: 67,
      deadline: '2024-02-29',
      status: 'on_track'
    },
    {
      id: '2', 
      name: 'タスク完了率80%維持',
      target_value: 80,
      current_value: 85,
      progress_percentage: 106,
      deadline: '2024-02-29',
      status: 'completed'
    }
  ]
}

function calculateTrends(overview: ProductivityOverview, timeRange: TimeRange): ProductivityTrend[] {
  return [
    {
      metric: 'completion_rate',
      current_value: overview.completion_rate,
      previous_value: overview.completion_rate - overview.completion_rate_change,
      change_percentage: overview.completion_rate_change,
      trend_direction: overview.completion_rate_change > 0 ? 'up' : overview.completion_rate_change < 0 ? 'down' : 'stable'
    }
  ]
}

function calculateEfficiencyScore(completionRate: number, focusTime: number, pomodoros: number): number {
  // Composite score based on completion rate, focus time, and pomodoro sessions
  const completionWeight = 0.4
  const focusTimeWeight = 0.3
  const pomodoroWeight = 0.3

  const normalizedFocusTime = Math.min(focusTime / 480, 1) * 100 // 8 hours max
  const normalizedPomodoros = Math.min(pomodoros / 16, 1) * 100 // 16 sessions max

  return (
    completionRate * completionWeight +
    normalizedFocusTime * focusTimeWeight +
    normalizedPomodoros * pomodoroWeight
  )
}

function getDateRange(timeRange: TimeRange) {
  const now = new Date()
  
  switch (timeRange) {
    case 'week':
      return {
        startDate: startOfWeek(now),
        endDate: now
      }
    case 'month':
      return {
        startDate: startOfMonth(now),
        endDate: now
      }
    case 'quarter':
      return {
        startDate: startOfQuarter(now),
        endDate: now
      }
    case 'year':
      return {
        startDate: startOfYear(now),
        endDate: now
      }
    default:
      return {
        startDate: startOfMonth(now),
        endDate: now
      }
  }
}

function getPreviousPeriod(startDate: Date, endDate: Date, timeRange: TimeRange) {
  const duration = endDate.getTime() - startDate.getTime()
  
  return {
    start: new Date(startDate.getTime() - duration),
    end: new Date(endDate.getTime() - duration)
  }
}