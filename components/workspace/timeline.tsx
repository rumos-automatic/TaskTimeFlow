'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i
  return {
    time: `${hour.toString().padStart(2, '0')}:00`,
    hour: hour,
    isBusinessHour: hour >= 9 && hour <= 17
  }
})

const mockEvents = [
  {
    id: '1',
    title: 'Daily Standup',
    time: '09:00',
    duration: 30,
    type: 'event',
    color: 'purple'
  },
  {
    id: '2',
    title: 'Design Review',
    time: '14:00',
    duration: 60,
    type: 'event',
    color: 'purple'
  },
  {
    id: '3',
    title: 'Code Review',
    time: '10:00',
    duration: 45,
    type: 'task',
    color: 'blue'
  }
]

export function Timeline() {
  const currentHour = new Date().getHours()

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-medium">Today, June 23</h3>
          <Button variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button variant="default" size="sm">
            Timeline
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Timeline Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Current Time Indicator */}
          <div 
            className="absolute left-0 right-0 border-t-2 border-red-500 z-10"
            style={{ top: `${(currentHour * 60) + new Date().getMinutes()}px` }}
          >
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-r-md">
              Now
            </div>
          </div>

          {/* Time Slots */}
          {timeSlots.map((slot) => (
            <div
              key={slot.time}
              className={`relative border-b border-border/20 h-16 flex items-start ${
                slot.isBusinessHour ? 'bg-muted/10' : ''
              } ${slot.hour === currentHour ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
            >
              {/* Time Label */}
              <div className="w-16 text-xs text-muted-foreground p-2 font-mono">
                {slot.time}
              </div>

              {/* Drop Zone */}
              <div className="flex-1 min-h-full border-l border-border/20 p-2 relative">
                {/* Events/Tasks at this time */}
                {mockEvents
                  .filter(event => event.time === slot.time)
                  .map((event) => (
                    <Card
                      key={event.id}
                      className={`absolute left-2 right-2 p-2 z-20 ${
                        event.type === 'event' 
                          ? 'bg-purple-100 border-purple-300 dark:bg-purple-950/30' 
                          : 'bg-blue-100 border-blue-300 dark:bg-blue-950/30'
                      }`}
                      style={{ 
                        height: `${event.duration}px`,
                        top: '0px'
                      }}
                    >
                      <div className="text-xs font-medium">{event.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {event.duration}min
                      </div>
                    </Card>
                  ))}

                {/* Available Time Slot Indicator */}
                {!mockEvents.some(event => event.time === slot.time) && (
                  <div className="absolute inset-0 border-2 border-dashed border-transparent hover:border-border/40 transition-colors">
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground opacity-0 hover:opacity-100 transition-opacity">
                      Drop task here
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}