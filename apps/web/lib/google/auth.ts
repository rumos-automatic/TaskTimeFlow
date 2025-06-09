import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { supabase } from '@/lib/supabase'

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

// Scopes for Google services
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/drive.file', // For storing backups
]

// Create OAuth2 client
export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  )
}

// Generate authorization URL
export function generateAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client()
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent',
    state: state || undefined
  })
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client()
  
  try {
    const { tokens } = await oauth2Client.getToken(code)
    return tokens
  } catch (error) {
    console.error('Error exchanging code for tokens:', error)
    throw new Error('Failed to exchange authorization code')
  }
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    return credentials
  } catch (error) {
    console.error('Error refreshing access token:', error)
    throw new Error('Failed to refresh access token')
  }
}

// Get authenticated OAuth2 client for a user
export async function getAuthenticatedClient(userId: string): Promise<OAuth2Client | null> {
  try {
    // Get user's Google tokens from database
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('status', 'active')
      .single()

    if (error || !integration) {
      console.error('No active Google integration found for user:', userId)
      return null
    }

    const oauth2Client = createOAuth2Client()
    
    // Set the credentials
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      token_type: 'Bearer',
      expiry_date: new Date(integration.token_expires_at).getTime()
    })

    // Set up automatic token refresh
    oauth2Client.on('tokens', async (tokens) => {
      console.log('New tokens received, updating database...')
      
      await supabase
        .from('integrations')
        .update({
          access_token: tokens.access_token,
          token_expires_at: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id)
    })

    return oauth2Client
  } catch (error) {
    console.error('Error getting authenticated client:', error)
    return null
  }
}

// Verify Google ID token
export async function verifyIdToken(idToken: string) {
  const client = new OAuth2Client(GOOGLE_CLIENT_ID)
  
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    })
    
    const payload = ticket.getPayload()
    return payload
  } catch (error) {
    console.error('Error verifying ID token:', error)
    throw new Error('Invalid ID token')
  }
}

// Revoke Google access
export async function revokeGoogleAccess(userId: string) {
  try {
    const oauth2Client = await getAuthenticatedClient(userId)
    if (!oauth2Client) {
      throw new Error('No Google integration found')
    }

    // Revoke the token
    await oauth2Client.revokeCredentials()

    // Update database
    await supabase
      .from('integrations')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('provider', 'google')

    return { success: true }
  } catch (error) {
    console.error('Error revoking Google access:', error)
    throw error
  }
}

// Check if user has valid Google integration
export async function hasValidGoogleIntegration(userId: string): Promise<boolean> {
  try {
    const { data: integration } = await supabase
      .from('integrations')
      .select('id, status, token_expires_at')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('status', 'active')
      .single()

    if (!integration) return false

    // Check if token is expired
    const tokenExpiry = new Date(integration.token_expires_at)
    const now = new Date()
    
    return tokenExpiry > now
  } catch (error) {
    console.error('Error checking Google integration:', error)
    return false
  }
}

// Get Google profile info
export async function getGoogleProfile(accessToken: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Google profile')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching Google profile:', error)
    throw error
  }
}