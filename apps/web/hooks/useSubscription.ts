'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { SUBSCRIPTION_PLANS, type SubscriptionPlan, getPlanLimits, isActionAllowed, getUsagePercentage } from '@/lib/stripe'
import { useAuth } from './useAuth'
import type { Database } from '@/types/supabase'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

interface UsageData {
  tasks: number
  projects: number
  storage: number
  apiCalls: number
}

export function useSubscription() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch subscription data
  const {
    data: subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError
  } = useQuery<Subscription | null>({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found
          return null
        }
        throw error
      }

      return data
    },
    enabled: !!user
  })

  // Fetch usage data
  const {
    data: usage,
    isLoading: usageLoading
  } = useQuery<UsageData>({
    queryKey: ['usage', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')

      const [tasksResult, projectsResult, storageResult, apiCallsResult] = await Promise.all([
        // Count tasks
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id),
        
        // Count projects
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id),
        
        // Calculate storage usage (simplified)
        supabase
          .from('file_attachments')
          .select('file_size')
          .eq('user_id', user.id),
        
        // Count API calls this month
        supabase
          .from('api_usage_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ])

      const storageBytes = storageResult.data?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0

      return {
        tasks: tasksResult.count || 0,
        projects: projectsResult.count || 0,
        storage: Math.round(storageBytes / 1024 / 1024), // Convert to MB
        apiCalls: apiCallsResult.count || 0
      }
    },
    enabled: !!user
  })

  // Create checkout session
  const createCheckout = useMutation({
    mutationFn: async ({ planId }: { planId: SubscriptionPlan }) => {
      if (!user) throw new Error('User not authenticated')

      const plan = SUBSCRIPTION_PLANS[planId]
      if (!plan.priceId) throw new Error('Invalid plan')

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId: user.id,
          userEmail: user.email,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      return sessionId
    }
  })

  // Create billing portal session
  const createBillingPortal = useMutation({
    mutationFn: async () => {
      if (!subscription?.stripe_customer_id) {
        throw new Error('No active subscription')
      }

      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: subscription.stripe_customer_id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create billing portal session')
      }

      const { url } = await response.json()
      return url
    }
  })

  // Cancel subscription
  const cancelSubscription = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error('No active subscription')

      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    }
  })

  // Utility functions
  const currentPlan = (subscription?.plan_id as SubscriptionPlan) || 'FREE'
  const planLimits = getPlanLimits(currentPlan)
  const planFeatures = SUBSCRIPTION_PLANS[currentPlan]

  const checkLimit = useCallback((action: keyof UsageData) => {
    if (!usage) return { allowed: true, percentage: 0 }
    
    const allowed = isActionAllowed(currentPlan, action, usage[action])
    const percentage = getUsagePercentage(currentPlan, action, usage[action])
    
    return { allowed, percentage }
  }, [currentPlan, usage])

  const isFeatureAvailable = useCallback((feature: string) => {
    return planFeatures.features.includes(feature)
  }, [planFeatures.features])

  const getDaysUntilRenewal = useCallback(() => {
    if (!subscription) return null
    
    const endDate = new Date(subscription.current_period_end)
    const now = new Date()
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }, [subscription])

  // Legacy compatibility
  const isActive = subscription?.status === 'active'
  const isTrialActive = subscription?.trial_end ? new Date(subscription.trial_end) > new Date() : false
  const isPastDue = subscription?.status === 'past_due'
  const isCancelled = subscription?.status === 'cancelled'

  const daysUntilExpiry = subscription?.current_period_end 
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  const trialDaysRemaining = subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null

  return {
    // Data
    subscription,
    usage,
    currentPlan,
    planLimits,
    planFeatures,
    
    // Loading states
    isLoading: subscriptionLoading || usageLoading,
    loading: subscriptionLoading || usageLoading, // Legacy
    subscriptionLoading,
    usageLoading,
    
    // Errors
    error: subscriptionError,
    subscriptionError,
    
    // Mutations
    createCheckout,
    createBillingPortal,
    cancelSubscription,
    
    // Utility functions
    checkLimit,
    isFeatureAvailable,
    getDaysUntilRenewal,
    
    // Computed values
    isFreePlan: currentPlan === 'FREE',
    isProPlan: currentPlan === 'PRO',
    isTeamPlan: currentPlan === 'TEAM',
    isEnterprisePlan: currentPlan === 'ENTERPRISE',
    hasActiveSubscription: !!subscription && subscription.status === 'active',
    isTrialing: subscription?.status === 'incomplete',
    isCanceled: subscription?.cancel_at_period_end,

    // Legacy compatibility
    isActive,
    isTrialActive,
    isPastDue,
    isCancelled,
    daysUntilExpiry,
    trialDaysRemaining,
    tier: user?.subscription_tier || 'free',
    billingCycle: subscription?.billing_cycle || 'monthly',
    price: subscription?.price_usd || 0,
    currency: subscription?.currency || 'USD'
  }
}

// Hook for checking if user can perform an action
export function useFeatureLimit(feature: keyof UsageData) {
  const { checkLimit, usage, isLoading } = useSubscription()
  
  const limit = checkLimit(feature)
  
  return {
    allowed: limit.allowed,
    percentage: limit.percentage,
    current: usage?.[feature] || 0,
    isLoading
  }
}

// Hook for subscription plans comparison
export function useSubscriptionPlans() {
  const { currentPlan } = useSubscription()
  
  const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    id: key as SubscriptionPlan,
    ...plan,
    isCurrent: key === currentPlan,
    isRecommended: key === 'PRO'
  }))
  
  return plans
}

export default useSubscription