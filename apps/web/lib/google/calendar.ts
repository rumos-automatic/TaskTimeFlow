import { google, calendar_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { getAuthenticatedClient } from './auth'
import { supabase } from '@/lib/supabase'
import type { TimelineSlot } from '@/types/timeline'

const calendar = google.calendar('v3')

// Calendar event colors (Google's predefined color IDs)
const TASK_COLOR_MAP = {
  urgent: '11', // Red
  high: '5',    // Yellow
  medium: '7',  // Blue  
  low: '2'      // Green
}

interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  colorId?: string
  extendedProperties?: {
    private?: {
      taskTimeFlowId?: string
      taskId?: string
      slotId?: string
      syncedAt?: string
    }
  }
}

// Get user's calendars
export async function getUserCalendars(userId: string) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    const response = await calendar.calendarList.list({
      auth,
      maxResults: 50,
      showHidden: false
    })

    return response.data.items || []
  } catch (error) {
    console.error('Error fetching calendars:', error)
    throw error
  }
}

// Get calendar events
export async function getCalendarEvents(
  userId: string,
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    const response = await calendar.events.list({
      auth,
      calendarId,
      timeMin: timeMin?.toISOString() || new Date().toISOString(),
      timeMax: timeMax?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250
    })

    return response.data.items || []
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    throw error
  }
}

// Create calendar event from timeline slot
export async function createCalendarEvent(
  userId: string,
  slot: TimelineSlot,
  taskTitle: string,
  taskDescription?: string,
  calendarId: string = 'primary'
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  const event: CalendarEvent = {
    summary: taskTitle,
    description: taskDescription || '',
    start: {
      dateTime: slot.start_time,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: slot.end_time,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    colorId: TASK_COLOR_MAP.medium,
    extendedProperties: {
      private: {
        taskTimeFlowId: `slot_${slot.id}`,
        taskId: slot.task_id,
        slotId: slot.id,
        syncedAt: new Date().toISOString()
      }
    }
  }

  try {
    const response = await calendar.events.insert({
      auth,
      calendarId,
      requestBody: event
    })

    // Store sync mapping
    await storeSyncMapping(userId, slot.id, response.data.id!, 'calendar')

    return response.data
  } catch (error) {
    console.error('Error creating calendar event:', error)
    throw error
  }
}

// Update calendar event
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  updates: Partial<CalendarEvent>,
  calendarId: string = 'primary'
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    const response = await calendar.events.patch({
      auth,
      calendarId,
      eventId,
      requestBody: updates
    })

    return response.data
  } catch (error) {
    console.error('Error updating calendar event:', error)
    throw error
  }
}

// Delete calendar event
export async function deleteCalendarEvent(
  userId: string,
  eventId: string,
  calendarId: string = 'primary'
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    await calendar.events.delete({
      auth,
      calendarId,
      eventId
    })

    // Remove sync mapping
    await removeSyncMapping(userId, eventId, 'calendar')

    return { success: true }
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    throw error
  }
}

// Sync timeline slots to Google Calendar
export async function syncSlotsToCalendar(
  userId: string,
  slots: TimelineSlot[],
  calendarId: string = 'primary'
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  const results = {
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [] as any[]
  }

  // Get existing sync mappings
  const { data: syncMappings } = await supabase
    .from('google_sync_mappings')
    .select('*')
    .eq('user_id', userId)
    .eq('sync_type', 'calendar')

  const mappingsBySlotId = new Map(
    syncMappings?.map(m => [m.tasktime_id, m]) || []
  )

  // Process each slot
  for (const slot of slots) {
    try {
      const mapping = mappingsBySlotId.get(`slot_${slot.id}`)
      
      if (mapping) {
        // Update existing event
        if (slot.is_deleted) {
          await deleteCalendarEvent(userId, mapping.google_id, calendarId)
          results.deleted++
        } else {
          await updateCalendarEvent(userId, mapping.google_id, {
            start: { dateTime: slot.start_time },
            end: { dateTime: slot.end_time },
            extendedProperties: {
              private: {
                syncedAt: new Date().toISOString()
              }
            }
          }, calendarId)
          results.updated++
        }
      } else if (!slot.is_deleted) {
        // Create new event
        const task = await getTaskDetails(slot.task_id)
        await createCalendarEvent(
          userId,
          slot,
          task.title,
          task.description,
          calendarId
        )
        results.created++
      }
    } catch (error) {
      console.error(`Error syncing slot ${slot.id}:`, error)
      results.errors.push({ slotId: slot.id, error: error.message })
    }
  }

  return results
}

// Watch for calendar changes (webhook)
export async function watchCalendar(
  userId: string,
  calendarId: string = 'primary',
  webhookUrl: string
) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    const response = await calendar.events.watch({
      auth,
      calendarId,
      requestBody: {
        id: `tasktime-${userId}-${Date.now()}`,
        type: 'web_hook',
        address: webhookUrl,
        expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString() // 7 days
      }
    })

    // Store webhook info
    await supabase
      .from('google_webhooks')
      .upsert({
        user_id: userId,
        resource_id: response.data.resourceId,
        resource_uri: response.data.resourceUri,
        channel_id: response.data.id,
        expiration: new Date(parseInt(response.data.expiration!)).toISOString(),
        calendar_id: calendarId,
        webhook_url: webhookUrl
      })

    return response.data
  } catch (error) {
    console.error('Error setting up calendar watch:', error)
    throw error
  }
}

// Stop watching calendar
export async function stopWatchingCalendar(userId: string, channelId: string, resourceId: string) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    await calendar.channels.stop({
      auth,
      requestBody: {
        id: channelId,
        resourceId: resourceId
      }
    })

    // Remove webhook info
    await supabase
      .from('google_webhooks')
      .delete()
      .eq('user_id', userId)
      .eq('channel_id', channelId)

    return { success: true }
  } catch (error) {
    console.error('Error stopping calendar watch:', error)
    throw error
  }
}

// Helper functions
async function storeSyncMapping(
  userId: string,
  taskTimeId: string,
  googleId: string,
  syncType: 'calendar' | 'tasks'
) {
  await supabase
    .from('google_sync_mappings')
    .upsert({
      user_id: userId,
      tasktime_id: taskTimeId,
      google_id: googleId,
      sync_type: syncType,
      last_synced_at: new Date().toISOString()
    })
}

async function removeSyncMapping(
  userId: string,
  googleId: string,
  syncType: 'calendar' | 'tasks'
) {
  await supabase
    .from('google_sync_mappings')
    .delete()
    .eq('user_id', userId)
    .eq('google_id', googleId)
    .eq('sync_type', syncType)
}

async function getTaskDetails(taskId: string) {
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  return task || { title: 'Unknown Task', description: '' }
}

// Create calendar for TaskTimeFlow
export async function createTaskTimeFlowCalendar(userId: string) {
  const auth = await getAuthenticatedClient(userId)
  if (!auth) throw new Error('No Google authentication found')

  try {
    const response = await calendar.calendars.insert({
      auth,
      requestBody: {
        summary: 'TaskTimeFlow',
        description: 'Tasks and schedules from TaskTimeFlow',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    })

    return response.data
  } catch (error) {
    console.error('Error creating calendar:', error)
    throw error
  }
}