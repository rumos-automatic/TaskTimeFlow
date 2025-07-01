import { useSupabaseTimerStore } from './use-supabase-timer-store'

// Re-export the Supabase timer store as the main timer store
// This ensures backward compatibility while using Supabase for persistence

export const useTimerStore = () => {
  const store = useSupabaseTimerStore()
  
  // Return the store directly with async methods
  return store
}
