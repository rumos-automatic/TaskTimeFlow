import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'フリープラン',
    description: '個人利用に最適な基本機能',
    price: 0,
    priceId: '',
    features: [
      'タスク管理（最大50個）',
      'かんばんボード',
      '24時間タイムライン',
      'ポモドーロタイマー',
      '基本分析',
      'Googleカレンダー連携'
    ],
    limits: {
      tasks: 50,
      projects: 3,
      teamMembers: 1,
      storage: 100, // MB
      apiCalls: 1000 // per month
    }
  },
  PRO: {
    id: 'pro',
    name: 'プロプラン',
    description: 'プロフェッショナル向けの高度な機能',
    price: 980,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      '無制限タスク・プロジェクト',
      'AI支援タスク分析',
      '高度な分析・レポート',
      'カスタムテンプレート',
      'PDF/CSVエクスポート',
      'ファイル添付（10GB）',
      'Google連携（全機能）',
      'プライオリティサポート'
    ],
    limits: {
      tasks: -1, // unlimited
      projects: -1,
      teamMembers: 1,
      storage: 10240, // 10GB
      apiCalls: 10000
    }
  },
  TEAM: {
    id: 'team',
    name: 'チームプラン',
    description: 'チーム協力のための包括的なソリューション',
    price: 1980,
    priceId: process.env.STRIPE_TEAM_PRICE_ID,
    features: [
      'プロプランの全機能',
      'チームコラボレーション（最大10名）',
      'チーム分析ダッシュボード',
      'ロールベース権限管理',
      'リアルタイム同期',
      'チーム目標設定',
      'カスタムワークフロー',
      '24/7サポート'
    ],
    limits: {
      tasks: -1,
      projects: -1,
      teamMembers: 10,
      storage: 51200, // 50GB
      apiCalls: 50000
    }
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'エンタープライズ',
    description: '大規模組織向けのカスタマイズ可能なソリューション',
    price: 0, // Custom pricing
    priceId: '',
    features: [
      'チームプランの全機能',
      '無制限チームメンバー',
      'SSO（Single Sign-On）',
      'カスタムブランディング',
      'オンプレミス展開オプション',
      'カスタム統合',
      '専任サポート',
      'SLA保証'
    ],
    limits: {
      tasks: -1,
      projects: -1,
      teamMembers: -1,
      storage: -1,
      apiCalls: -1
    }
  }
} as const

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS

// Create checkout session
export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  priceId: string
  userId: string
  userEmail: string
  successUrl: string
  cancelUrl: string
}) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      client_reference_id: userId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        userId,
      },
    })

    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

// Create billing portal session
export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    throw error
  }
}

// Get subscription by customer ID
export async function getSubscriptionByCustomerId(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    return subscriptions.data[0] || null
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}

// Check if user has active subscription
export async function hasActiveSubscription(customerId: string) {
  const subscription = await getSubscriptionByCustomerId(customerId)
  return subscription && subscription.status === 'active'
}

// Get plan limits for a subscription
export function getPlanLimits(planId: SubscriptionPlan) {
  return SUBSCRIPTION_PLANS[planId]?.limits || SUBSCRIPTION_PLANS.FREE.limits
}

// Check if action is allowed based on plan limits
export function isActionAllowed(
  planId: SubscriptionPlan,
  action: keyof typeof SUBSCRIPTION_PLANS.FREE.limits,
  currentUsage: number
): boolean {
  const limits = getPlanLimits(planId)
  const limit = limits[action]
  
  // -1 means unlimited
  if (limit === -1) return true
  
  return currentUsage < limit
}

// Get plan by price ID
export function getPlanByPriceId(priceId: string): SubscriptionPlan | null {
  for (const [planKey, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (plan.priceId === priceId) {
      return planKey as SubscriptionPlan
    }
  }
  return null
}

// Calculate usage percentage
export function getUsagePercentage(
  planId: SubscriptionPlan,
  action: keyof typeof SUBSCRIPTION_PLANS.FREE.limits,
  currentUsage: number
): number {
  const limits = getPlanLimits(planId)
  const limit = limits[action]
  
  if (limit === -1) return 0 // Unlimited
  
  return Math.min(100, (currentUsage / limit) * 100)
}

// Webhook helpers
export function constructWebhookEvent(body: string, signature: string) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not defined')
  }

  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}

export default stripe