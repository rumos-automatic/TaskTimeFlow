import { useSupabaseTimerStore } from './use-supabase-timer-store'

// Re-export the Supabase timer store as the main timer store
// This ensures backward compatibility while using Supabase for persistence

export const useTimerStore = () => {
  const store = useSupabaseTimerStore()
  
  // For backward compatibility, add sync versions of async methods
  const getTodayTotalTime = () => {
    // Return 0 synchronously, the component should use the async version
    store.getTodayTotalTime().then(() => {})
    return 0
  }
  
  const getTaskTotalTime = (taskId: string) => {
    // Return 0 synchronously, the component should use the async version
    store.getTaskTotalTime(taskId).then(() => {})
    return 0
  }
  
  return {
    ...store,
    getTodayTotalTime,
    getTaskTotalTime
  }
}
