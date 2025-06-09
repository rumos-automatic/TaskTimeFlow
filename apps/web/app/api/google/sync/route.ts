import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { syncSlotsToCalendar } from '@/lib/google/calendar'
import { syncTasksToGoogle, syncTasksFromGoogle } from '@/lib/google/tasks'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      syncType = 'bidirectional', // 'to_google', 'from_google', 'bidirectional'
      includeCalendar = true,
      includeTasks = true,
      projectId,
      date
    } = body

    // Check if user has active Google integration
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('status', 'active')
      .single()

    if (!integration) {
      return NextResponse.json(
        { error: 'No active Google integration found' },
        { status: 400 }
      )
    }

    // Create sync log
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({
        user_id: user.id,
        provider: 'google',
        sync_type: 'manual',
        direction: syncType,
        status: 'started'
      })
      .select()
      .single()

    const results = {
      calendar: null as any,
      tasks: null as any,
      errors: [] as any[]
    }

    // Sync calendar events
    if (includeCalendar && integration.sync_calendar) {
      try {
        // Get timeline slots for the specified date or current month
        const startDate = date ? new Date(date) : new Date()
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        
        const endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 1)

        const { data: slots } = await supabase
          .from('timeline_slots')
          .select('*, tasks!inner(*)')
          .eq('user_id', user.id)
          .gte('start_time', startDate.toISOString())
          .lt('start_time', endDate.toISOString())

        if (slots && (syncType === 'to_google' || syncType === 'bidirectional')) {
          results.calendar = await syncSlotsToCalendar(
            user.id,
            slots,
            integration.calendar_id
          )
        }
      } catch (error: any) {
        console.error('Calendar sync error:', error)
        results.errors.push({
          type: 'calendar',
          message: error.message
        })
      }
    }

    // Sync tasks
    if (includeTasks && integration.sync_tasks && projectId) {
      try {
        if (syncType === 'to_google' || syncType === 'bidirectional') {
          // Get all tasks for the project
          const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('position')

          if (tasks) {
            results.tasks = await syncTasksToGoogle(
              user.id,
              tasks,
              integration.task_list_id
            )
          }
        }

        if (syncType === 'from_google' || syncType === 'bidirectional') {
          const fromGoogleResults = await syncTasksFromGoogle(
            user.id,
            projectId,
            integration.task_list_id
          )
          
          if (results.tasks) {
            results.tasks.created += fromGoogleResults.created
            results.tasks.updated += fromGoogleResults.updated
            results.tasks.errors = [...results.tasks.errors, ...fromGoogleResults.errors]
          } else {
            results.tasks = fromGoogleResults
          }
        }
      } catch (error: any) {
        console.error('Tasks sync error:', error)
        results.errors.push({
          type: 'tasks',
          message: error.message
        })
      }
    }

    // Update sync log
    const totalItems = (results.calendar?.created || 0) + (results.calendar?.updated || 0) +
                      (results.calendar?.deleted || 0) + (results.tasks?.created || 0) +
                      (results.tasks?.updated || 0) + (results.tasks?.deleted || 0)

    await supabase
      .from('sync_logs')
      .update({
        status: results.errors.length > 0 ? 'failed' : 'completed',
        items_created: (results.calendar?.created || 0) + (results.tasks?.created || 0),
        items_updated: (results.calendar?.updated || 0) + (results.tasks?.updated || 0),
        items_deleted: (results.calendar?.deleted || 0) + (results.tasks?.deleted || 0),
        errors: results.errors,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(syncLog.started_at).getTime()
      })
      .eq('id', syncLog.id)

    // Update integration last sync time
    await supabase
      .from('integrations')
      .update({
        last_synced_at: new Date().toISOString()
      })
      .eq('id', integration.id)

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
      syncLogId: syncLog.id
    })
  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    )
  }
}