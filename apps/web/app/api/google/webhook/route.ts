import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getCalendarEvents } from '@/lib/google/calendar'
import { getTasks } from '@/lib/google/tasks'

// Handle Google push notifications
export async function POST(request: NextRequest) {
  try {
    // Verify the webhook is from Google
    const channelId = request.headers.get('x-goog-channel-id')
    const resourceId = request.headers.get('x-goog-resource-id')
    const resourceState = request.headers.get('x-goog-resource-state')
    const resourceUri = request.headers.get('x-goog-resource-uri')

    if (!channelId || !resourceId || !resourceState) {
      return NextResponse.json(
        { error: 'Invalid webhook headers' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Find the webhook registration
    const { data: webhook } = await supabase
      .from('google_webhooks')
      .select('*')
      .eq('channel_id', channelId)
      .eq('resource_id', resourceId)
      .single()

    if (!webhook) {
      return NextResponse.json(
        { error: 'Unknown webhook' },
        { status: 404 }
      )
    }

    // Check if webhook is expired
    if (new Date(webhook.expiration) < new Date()) {
      return NextResponse.json(
        { error: 'Webhook expired' },
        { status: 410 }
      )
    }

    // Handle different resource states
    if (resourceState === 'sync') {
      // Initial sync message, just acknowledge
      return NextResponse.json({ status: 'ok' })
    }

    // Create sync log
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({
        user_id: webhook.user_id,
        provider: 'google',
        sync_type: 'webhook',
        direction: 'from_google',
        status: 'started',
        sync_data: {
          channelId,
          resourceId,
          resourceState,
          resourceUri
        }
      })
      .select()
      .single()

    try {
      // Check what type of resource changed
      if (webhook.calendar_id) {
        // Calendar event changed
        await handleCalendarChange(webhook.user_id, webhook.calendar_id)
      } else {
        // Task list changed
        await handleTasksChange(webhook.user_id)
      }

      // Update sync log
      await supabase
        .from('sync_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(syncLog.started_at).getTime()
        })
        .eq('id', syncLog.id)

      return NextResponse.json({ status: 'ok' })
    } catch (error: any) {
      // Update sync log with error
      await supabase
        .from('sync_logs')
        .update({
          status: 'failed',
          errors: [{ message: error.message }],
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(syncLog.started_at).getTime()
        })
        .eq('id', syncLog.id)

      throw error
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCalendarChange(userId: string, calendarId: string) {
  // Get recent calendar events
  const events = await getCalendarEvents(
    userId,
    calendarId,
    new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
  )

  // Process events and sync to TaskTimeFlow
  // This is a simplified version - in production, you'd want to:
  // 1. Compare with existing mappings
  // 2. Handle conflicts
  // 3. Update only changed items
  
  console.log(`Processing ${events.length} calendar events for user ${userId}`)
}

async function handleTasksChange(userId: string) {
  const supabase = createRouteHandlerClient({ cookies })
  
  // Get user's task list ID
  const { data: integration } = await supabase
    .from('integrations')
    .select('task_list_id')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single()

  if (!integration?.task_list_id) return

  // Get recent tasks
  const tasks = await getTasks(userId, integration.task_list_id, {
    showCompleted: true
  })

  // Process tasks and sync to TaskTimeFlow
  console.log(`Processing ${tasks.length} tasks for user ${userId}`)
}

// Endpoint to set up webhooks
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { calendarId = 'primary' } = await request.json()

    // Set up calendar watch
    const { watchCalendar } = await import('@/lib/google/calendar')
    
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/google/webhook`
    const watchResponse = await watchCalendar(user.id, calendarId, webhookUrl)

    return NextResponse.json({
      success: true,
      channelId: watchResponse.id,
      expiration: watchResponse.expiration
    })
  } catch (error) {
    console.error('Webhook setup error:', error)
    return NextResponse.json(
      { error: 'Failed to set up webhook' },
      { status: 500 }
    )
  }
}