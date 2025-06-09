import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createTaskTimeFlowCalendar } from '@/lib/google/calendar'
import { createTaskTimeFlowTaskList } from '@/lib/google/tasks'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const results = {
      calendar: null as any,
      taskList: null as any,
      errors: [] as any[]
    }

    // Create TaskTimeFlow calendar
    try {
      const calendar = await createTaskTimeFlowCalendar(user.id)
      results.calendar = calendar

      // Update user settings with calendar ID
      const { data: currentIntegration } = await supabase
        .from('integrations')
        .select('provider_data')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single()

      const updatedProviderData = {
        ...(currentIntegration?.provider_data || {}),
        calendar_id: calendar.id
      }

      await supabase
        .from('integrations')
        .update({
          calendar_id: calendar.id,
          provider_data: updatedProviderData
        })
        .eq('user_id', user.id)
        .eq('provider', 'google')
    } catch (error: any) {
      console.error('Error creating calendar:', error)
      results.errors.push({
        type: 'calendar',
        message: error.message
      })
    }

    // Create TaskTimeFlow task list
    try {
      const taskList = await createTaskTimeFlowTaskList(user.id)
      results.taskList = taskList

      // Update user settings with task list ID
      await supabase
        .from('integrations')
        .update({
          task_list_id: taskList.id,
          provider_data: supabase.sql`provider_data || jsonb_build_object('task_list_id', ${taskList.id})`
        })
        .eq('user_id', user.id)
        .eq('provider', 'google')
    } catch (error: any) {
      console.error('Error creating task list:', error)
      results.errors.push({
        type: 'taskList',
        message: error.message
      })
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      results
    })
  } catch (error) {
    console.error('Setup API error:', error)
    return NextResponse.json(
      { error: 'Setup failed', details: error.message },
      { status: 500 }
    )
  }
}