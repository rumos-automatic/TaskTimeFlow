import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, getGoogleProfile } from '@/lib/google/auth'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(
        new URL('/settings/integrations?error=oauth_error', request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=missing_params', request.url)
      )
    }

    // Decode and verify state
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch (e) {
      console.error('Invalid state parameter')
      return NextResponse.redirect(
        new URL('/settings/integrations?error=invalid_state', request.url)
      )
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated and matches state
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=auth_mismatch', request.url)
      )
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens from Google')
    }

    // Get Google profile info
    const profile = await getGoogleProfile(tokens.access_token)

    // Store integration in database
    const { error: dbError } = await supabase
      .from('integrations')
      .upsert({
        user_id: user.id,
        provider: 'google',
        status: 'active',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString(),
        provider_user_id: profile.id,
        provider_email: profile.email,
        provider_data: {
          name: profile.name,
          picture: profile.picture,
          locale: profile.locale
        },
        updated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Database error storing integration:', dbError)
      return NextResponse.redirect(
        new URL('/settings/integrations?error=db_error', request.url)
      )
    }

    // Create default TaskTimeFlow calendar and task list
    try {
      // This will be done in background job
      await fetch(`${request.nextUrl.origin}/api/google/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({ userId: user.id })
      })
    } catch (error) {
      console.error('Error setting up Google services:', error)
      // Non-critical, continue
    }

    // Redirect to success page
    const returnUrl = stateData.returnUrl || '/settings/integrations'
    return NextResponse.redirect(
      new URL(`${returnUrl}?success=google_connected`, request.url)
    )
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings/integrations?error=callback_error', request.url)
    )
  }
}