import { NextRequest, NextResponse } from 'next/server'
import { generateAuthUrl } from '@/lib/google/auth'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Generate state token for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
      returnUrl: request.nextUrl.searchParams.get('returnUrl') || '/settings/integrations'
    })).toString('base64')

    // Generate Google OAuth URL
    const authUrl = generateAuthUrl(state)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating Google auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}