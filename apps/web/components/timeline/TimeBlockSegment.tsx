'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Zap, Coffee, Briefcase, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimeBlockSegment as TimeBlockSegmentType } from '@/types/timeline'

interface TimeBlockSegmentProps {
  segment: TimeBlockSegmentType
  hourHeight: number
}

export function TimeBlockSegment({ segment, hourHeight }: TimeBlockSegmentProps) {
  const { time_block, start_minute, end_minute, duration } = segment
  
  // Calculate position and height
  const topOffset = (start_minute / 60) * hourHeight
  const height = (duration / 60) * hourHeight
  
  const getEnergyIcon = () => {
    switch (time_block.energy_level) {
      case 'high':
        return <Zap className="h-3 w-3 text-yellow-400" />
      case 'medium':
        return <Zap className="h-3 w-3 text-orange-400" />
      case 'low':
        return <Zap className="h-3 w-3 text-gray-400" />
    }
  }
  
  const getTypeIcon = () => {
    if (time_block.is_break_time) {
      return <Coffee className="h-3 w-3" />
    }
    if (time_block.is_work_time) {
      return <Briefcase className="h-3 w-3" />
    }
    return <Home className="h-3 w-3" />
  }

  const getEnergyLevelText = () => {
    switch (time_block.energy_level) {
      case 'high':
        return '高エネルギー'
      case 'medium':
        return '中エネルギー'
      case 'low':
        return '低エネルギー'
    }
  }

  const getBlockTypeText = () => {
    if (time_block.is_break_time) return '休憩時間'
    if (time_block.is_work_time) return '作業時間'
    return 'プライベート時間'
  }

  // Create a more subtle background style
  const backgroundStyle = {
    backgroundColor: time_block.color + '20', // Add transparency
    borderLeft: `4px solid ${time_block.color}`
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'absolute left-0 right-0 border border-gray-100 rounded-r transition-all duration-200 hover:z-10',
              time_block.is_work_time && 'hover:shadow-sm',
              time_block.is_break_time && 'opacity-70'
            )}
            style={{
              top: `${topOffset}px`,
              height: `${Math.max(height, 4)}px`, // Minimum 4px height
              ...backgroundStyle
            }}
          >
            {/* Content (only show if tall enough) */}
            {height > 30 && (
              <div className="p-2 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-1">
                    {getTypeIcon()}
                    {getEnergyIcon()}
                  </div>
                  
                  <div className="text-xs text-gray-600 opacity-70">
                    {duration}分
                  </div>
                </div>
                
                {height > 50 && (
                  <div className="flex-1 flex items-center">
                    <span className="text-xs font-medium text-gray-700 line-clamp-2">
                      {time_block.label}
                    </span>
                  </div>
                )}
                
                {height > 70 && time_block.description && (
                  <div className="text-xs text-gray-600 line-clamp-1 opacity-80">
                    {time_block.description}
                  </div>
                )}
              </div>
            )}
            
            {/* Minimal indicator for small blocks */}
            {height <= 30 && height > 8 && (
              <div className="p-1 flex items-center justify-center h-full">
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {time_block.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{time_block.label}</div>
            
            {time_block.description && (
              <div className="text-sm text-gray-600">
                {time_block.description}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {getBlockTypeText()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getEnergyLevelText()}
              </Badge>
            </div>
            
            <div className="text-xs text-gray-500">
              継続時間: {duration}分
            </div>
            
            {time_block.days_of_week.length < 7 && (
              <div className="text-xs text-gray-500">
                適用日: {time_block.days_of_week.map(day => {
                  const days = ['日', '月', '火', '水', '木', '金', '土']
                  return days[day]
                }).join(', ')}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default TimeBlockSegment