import { Task, RecurrenceType, RecurringPattern } from '@/lib/types'

/**
 * 繰り返しタスクの次の発生日を計算する
 */
export function calculateNextOccurrence(
  task: Task,
  fromDate: Date = new Date()
): Date | null {
  if (!task.isRecurring || !task.recurrenceType || task.recurrenceType === 'none') {
    return null
  }

  const interval = task.recurrenceInterval || 1
  let nextDate = new Date(fromDate)

  switch (task.recurrenceType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval)
      break

    case 'weekly':
      if (task.recurringPattern?.daysOfWeek && task.recurringPattern.daysOfWeek.length > 0) {
        // 指定された曜日の次の発生を見つける
        const currentDay = nextDate.getDay()
        const targetDays = task.recurringPattern.daysOfWeek.sort((a, b) => a - b)
        
        let found = false
        for (const targetDay of targetDays) {
          if (targetDay > currentDay) {
            nextDate.setDate(nextDate.getDate() + (targetDay - currentDay))
            found = true
            break
          }
        }
        
        if (!found) {
          // 今週に該当する曜日がない場合、来週の最初の曜日
          const daysUntilNextWeek = 7 - currentDay + targetDays[0]
          nextDate.setDate(nextDate.getDate() + daysUntilNextWeek)
        }
      } else {
        // 曜日指定がない場合は週間隔で追加
        nextDate.setDate(nextDate.getDate() + (7 * interval))
      }
      break

    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval)
      break

    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval)
      break

    default:
      return null
  }

  // 終了日をチェック
  if (task.recurrenceEndDate && nextDate > task.recurrenceEndDate) {
    return null
  }

  return nextDate
}

/**
 * 繰り返しタスクの今後の発生日リストを生成する
 */
export function generateOccurrences(
  task: Task,
  fromDate: Date = new Date(),
  limit: number = 30
): Date[] {
  const occurrences: Date[] = []
  let currentDate = new Date(fromDate)

  for (let i = 0; i < limit; i++) {
    const nextDate = calculateNextOccurrence(task, currentDate)
    if (!nextDate) break

    occurrences.push(new Date(nextDate))
    currentDate = new Date(nextDate)
    currentDate.setDate(currentDate.getDate() + 1) // 次の計算のために1日進める
  }

  return occurrences
}

/**
 * 繰り返しタスクから個別のタスクインスタンスを作成する
 */
export function createTaskInstance(
  parentTask: Task,
  scheduledDate: Date,
  userI: string
): Omit<Task, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: parentTask.title,
    description: parentTask.description,
    priority: parentTask.priority,
    urgency: parentTask.urgency,
    category: parentTask.category,
    estimatedTime: parentTask.estimatedTime,
    status: 'todo',
    scheduledDate,
    scheduledTime: parentTask.scheduledTime,
    duration: parentTask.duration,
    parentRecurringTaskId: parentTask.id,
    isRecurring: false // インスタンスは繰り返しタスクではない
  }
}

/**
 * 今日生成すべき繰り返しタスクをチェックする
 */
export function shouldGenerateTaskForDate(
  task: Task,
  targetDate: Date
): boolean {
  if (!task.isRecurring || !task.recurrenceType || task.recurrenceType === 'none') {
    return false
  }

  // タスクの作成日以降の日付のみ対象
  if (targetDate < task.createdAt) {
    return false
  }

  // 終了日をチェック
  if (task.recurrenceEndDate && targetDate > task.recurrenceEndDate) {
    return false
  }

  const taskDate = new Date(task.createdAt)
  const diffTime = targetDate.getTime() - taskDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  switch (task.recurrenceType) {
    case 'daily':
      return diffDays % (task.recurrenceInterval || 1) === 0

    case 'weekly':
      if (task.recurringPattern?.daysOfWeek && task.recurringPattern.daysOfWeek.length > 0) {
        const targetDay = targetDate.getDay()
        const weeksSinceStart = Math.floor(diffDays / 7)
        return (
          task.recurringPattern.daysOfWeek.includes(targetDay) &&
          weeksSinceStart % (task.recurrenceInterval || 1) === 0
        )
      } else {
        return diffDays % (7 * (task.recurrenceInterval || 1)) === 0
      }

    case 'monthly':
      const monthsDiff = 
        (targetDate.getFullYear() - taskDate.getFullYear()) * 12 +
        (targetDate.getMonth() - taskDate.getMonth())
      return (
        monthsDiff % (task.recurrenceInterval || 1) === 0 &&
        targetDate.getDate() === taskDate.getDate()
      )

    case 'yearly':
      const yearsDiff = targetDate.getFullYear() - taskDate.getFullYear()
      return (
        yearsDiff % (task.recurrenceInterval || 1) === 0 &&
        targetDate.getMonth() === taskDate.getMonth() &&
        targetDate.getDate() === taskDate.getDate()
      )

    default:
      return false
  }
}

/**
 * 繰り返しタスクの説明文を生成する
 */
export function getRecurrenceDescription(task: Task): string {
  if (!task.isRecurring || !task.recurrenceType || task.recurrenceType === 'none') {
    return ''
  }

  const interval = task.recurrenceInterval || 1
  let description = ''

  switch (task.recurrenceType) {
    case 'daily':
      description = interval === 1 ? '毎日' : `${interval}日おき`
      break

    case 'weekly':
      if (task.recurringPattern?.daysOfWeek && task.recurringPattern.daysOfWeek.length > 0) {
        const dayNames = ['日', '月', '火', '水', '木', '金', '土']
        const selectedDays = task.recurringPattern.daysOfWeek
          .map(day => dayNames[day])
          .join('・')
        description = interval === 1 ? `毎週 ${selectedDays}曜日` : `${interval}週おき ${selectedDays}曜日`
      } else {
        description = interval === 1 ? '毎週' : `${interval}週おき`
      }
      break

    case 'monthly':
      description = interval === 1 ? '毎月' : `${interval}ヶ月おき`
      break

    case 'yearly':
      description = interval === 1 ? '毎年' : `${interval}年おき`
      break
  }

  if (task.recurrenceEndDate) {
    const endDate = task.recurrenceEndDate.toLocaleDateString('ja-JP')
    description += ` (${endDate}まで)`
  }

  return description
}