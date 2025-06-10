// Global type definitions for browser APIs and third-party services

interface Window {
  // Vercel Analytics
  va?: (event: string, category: string, data: {
    metric: string
    value: number
    label: string
  }) => void
}

interface PerformanceMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface Performance {
  memory?: PerformanceMemory
}

// Extend PerformanceEntry for Layout Shift metrics
interface LayoutShift extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}

// Google API types
interface GoogleIntegrationData {
  provider: string
  access_token?: string
  refresh_token?: string
  token_type?: string
  expiry_date?: number
  provider_data?: {
    id?: string
    email?: string
    name?: string
    given_name?: string
    family_name?: string
    picture?: string
    locale?: string
    hd?: string
  }
  scopes?: string[]
  created_at: string
  updated_at: string
  // Additional properties used in GoogleIntegration component
  provider_email?: string
  last_synced_at?: string
  sync_calendar?: boolean
  sync_tasks?: boolean
  sync_enabled?: boolean
  status?: 'active' | 'error' | 'inactive'
  calendar_id?: string
  task_list_id?: string
}

// AI API Response Types
interface OpenAIResponse {
  choices: {
    message: {
      content: string
      function_call?: {
        arguments: string
      }
    }
    finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter'
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface ClaudeResponse {
  content: {
    text: string
  }[]
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence'
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string
      }[]
    }
    finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER'
  }[]
}

// Generic API Error Interface
interface APIError {
  message: string
  code?: string | number
  status?: number
  details?: any
}

// Google Sync Error Interface
interface GoogleSyncError {
  taskId?: string
  googleId?: string
  error: string
}

// AI Usage Statistics Interface
interface MonthlyUsage {
  month: string
  sessions: number
  tokens: number
  cost_usd: number
  top_features: string[]
}

// Before Install Prompt Event (declared in ServiceWorkerRegistration.tsx as well)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}