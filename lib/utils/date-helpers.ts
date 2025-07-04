import { differenceInDays, format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'

export interface DueDateInfo {
  text: string
  colorClass: string
  isOverdue: boolean
  daysUntilDue: number
}

export function getDueDateInfo(dueDate: Date | undefined): DueDateInfo | null {
  if (!dueDate) {
    return null
  }

  const today = startOfDay(new Date())
  const dueDateStart = startOfDay(dueDate)
  const daysUntilDue = differenceInDays(dueDateStart, today)

  // 期限切れ
  if (isPast(dueDateStart) && !isToday(dueDate)) {
    const daysOverdue = Math.abs(daysUntilDue)
    return {
      text: `期限切れ (${daysOverdue}日前)`,
      colorClass: 'text-red-600 bg-red-50',
      isOverdue: true,
      daysUntilDue
    }
  }

  // 今日が期限
  if (isToday(dueDate)) {
    return {
      text: '今日',
      colorClass: 'text-orange-600 bg-orange-50',
      isOverdue: false,
      daysUntilDue: 0
    }
  }

  // 明日が期限
  if (isTomorrow(dueDate)) {
    return {
      text: '明日',
      colorClass: 'text-amber-600 bg-amber-50',
      isOverdue: false,
      daysUntilDue: 1
    }
  }

  // 3日以内
  if (daysUntilDue <= 3) {
    return {
      text: format(dueDate, 'M/d', { locale: ja }),
      colorClass: 'text-amber-600 bg-amber-50',
      isOverdue: false,
      daysUntilDue
    }
  }

  // それ以降
  return {
    text: format(dueDate, 'M/d', { locale: ja }),
    colorClass: 'text-gray-600 bg-gray-50',
    isOverdue: false,
    daysUntilDue
  }
}

export function formatDueDateForInput(date: Date | undefined): string {
  if (!date) return ''
  return format(date, 'yyyy-MM-dd')
}

export function parseDueDateFromInput(dateString: string): Date | undefined {
  if (!dateString) return undefined
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? undefined : date
}