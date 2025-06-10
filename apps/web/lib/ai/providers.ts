import type { 
  AIProvider, 
  AIProviderType, 
  AISession, 
  AIInputData, 
  AIOutputData,
  AIConfiguration,
  AIError,
  AIFeature
} from '@/types/ai'

// AI Provider configurations
export const AI_PROVIDERS: Record<AIProviderType, AIProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI GPT',
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Most capable model for complex tasks',
        contextWindow: 8192,
        maxOutputTokens: 4096,
        costPer1KTokens: { input: 0.03, output: 0.06 },
        isDefault: true
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective for most tasks',
        contextWindow: 4096,
        maxOutputTokens: 4096,
        costPer1KTokens: { input: 0.001, output: 0.002 }
      }
    ],
    features: [
      'task_breakdown',
      'time_estimation',
      'priority_suggestion',
      'scheduling_optimization',
      'content_generation',
      'analysis_insights',
      'natural_language_query',
      'smart_categorization'
    ],
    pricing: {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
    },
    maxTokens: 8192,
    supportsStreaming: true,
    supportsImages: true,
    supportsFunctionCalling: true
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Most capable model for complex reasoning',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        costPer1KTokens: { input: 0.015, output: 0.075 },
        isDefault: true
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and cost',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        costPer1KTokens: { input: 0.003, output: 0.015 }
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast and lightweight',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        costPer1KTokens: { input: 0.00025, output: 0.00125 }
      }
    ],
    features: [
      'task_breakdown',
      'time_estimation',
      'priority_suggestion',
      'scheduling_optimization',
      'content_generation',
      'analysis_insights'
    ],
    pricing: {
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    },
    maxTokens: 200000,
    supportsStreaming: true,
    supportsImages: true,
    supportsFunctionCalling: false
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    models: [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Advanced multimodal capabilities',
        contextWindow: 32768,
        maxOutputTokens: 8192,
        costPer1KTokens: { input: 0.001, output: 0.002 },
        isDefault: true
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        description: 'Optimized for vision tasks',
        contextWindow: 16384,
        maxOutputTokens: 2048,
        costPer1KTokens: { input: 0.001, output: 0.002 }
      }
    ],
    features: [
      'task_breakdown',
      'time_estimation',
      'content_generation',
      'analysis_insights'
    ],
    pricing: {
      'gemini-pro': { input: 0.001, output: 0.002 },
      'gemini-pro-vision': { input: 0.001, output: 0.002 }
    },
    maxTokens: 32768,
    supportsStreaming: true,
    supportsImages: true,
    supportsFunctionCalling: true
  }
}

// Base AI Service class
export abstract class BaseAIService {
  protected provider: AIProvider
  protected apiKey: string
  protected baseUrl?: string

  constructor(provider: AIProvider, apiKey: string, baseUrl?: string) {
    this.provider = provider
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  abstract generateCompletion(
    input: AIInputData,
    model?: string,
    stream?: boolean
  ): Promise<AIOutputData>

  abstract estimateTokens(text: string): number
  abstract calculateCost(inputTokens: number, outputTokens: number, model: string): number

  protected handleError(error: APIError | Error | unknown, context?: any): AIError {
    const apiError = error as APIError
    return {
      code: apiError.code || 'UNKNOWN_ERROR',
      message: apiError.message || 'An unknown error occurred',
      provider: this.provider.id,
      context
    }
  }
}

// OpenAI Service
export class OpenAIService extends BaseAIService {
  private client: any // TODO: Replace with proper OpenAI client type when imported

  constructor(apiKey: string) {
    super(AI_PROVIDERS.openai, apiKey)
    // Initialize OpenAI client here
    // this.client = new OpenAI({ apiKey })
  }

  async generateCompletion(
    input: AIInputData,
    model: string = 'gpt-4',
    stream: boolean = false
  ): Promise<AIOutputData> {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are TaskTimeFlow AI, an intelligent task management assistant. Provide helpful, accurate, and actionable advice for productivity and task management.'
        },
        {
          role: 'user',
          content: input.prompt
        }
      ]

      const requestBody = {
        model,
        messages,
        max_tokens: input.parameters?.max_tokens || 1000,
        temperature: input.parameters?.temperature || 0.7,
        top_p: input.parameters?.top_p || 1,
        frequency_penalty: input.parameters?.frequency_penalty || 0,
        presence_penalty: input.parameters?.presence_penalty || 0,
        stream
      }

      // Add function calling if supported
      if (input.parameters?.functions && this.provider.supportsFunctionCalling) {
        requestBody.functions = input.parameters.functions
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data: OpenAIResponse = await response.json()

      return {
        response: data.choices[0].message.content,
        confidence_score: this.calculateConfidence(data),
        structured_data: data.choices[0].message.function_call ? 
          JSON.parse(data.choices[0].message.function_call.arguments) : undefined
      }
    } catch (error) {
      throw this.handleError(error, { input, model })
    }
  }

  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for OpenAI
    return Math.ceil(text.length / 4)
  }

  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = this.provider.pricing[model]
    if (!pricing) return 0

    return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
  }

  private calculateConfidence(response: OpenAIResponse): number {
    // Simple confidence calculation based on response completeness
    const firstChoice = response.choices?.[0]
    if (!firstChoice) return 50
    
    if (firstChoice.finish_reason === 'stop') return 85
    if (firstChoice.finish_reason === 'length') return 70
    return 60
  }
}

// Claude Service
export class ClaudeService extends BaseAIService {
  constructor(apiKey: string) {
    super(AI_PROVIDERS.claude, apiKey, 'https://api.anthropic.com')
  }

  async generateCompletion(
    input: AIInputData,
    model: string = 'claude-3-opus',
    stream: boolean = false
  ): Promise<AIOutputData> {
    try {
      const requestBody = {
        model,
        max_tokens: input.parameters?.max_tokens || 1000,
        temperature: input.parameters?.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: input.prompt
          }
        ],
        stream
      }

      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`)
      }

      const data: ClaudeResponse = await response.json()

      return {
        response: data.content[0].text,
        confidence_score: this.calculateConfidence(data)
      }
    } catch (error) {
      throw this.handleError(error, { input, model })
    }
  }

  estimateTokens(text: string): number {
    // Rough estimation for Claude
    return Math.ceil(text.length / 4)
  }

  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = this.provider.pricing[model]
    if (!pricing) return 0

    return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
  }

  private calculateConfidence(response: ClaudeResponse): number {
    if (response?.stop_reason === 'end_turn') return 85
    if (response?.stop_reason === 'max_tokens') return 70
    return 60
  }
}

// Gemini Service
export class GeminiService extends BaseAIService {
  constructor(apiKey: string) {
    super(AI_PROVIDERS.gemini, apiKey, 'https://generativelanguage.googleapis.com')
  }

  async generateCompletion(
    input: AIInputData,
    model: string = 'gemini-pro',
    stream: boolean = false
  ): Promise<AIOutputData> {
    try {
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: input.prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: input.parameters?.temperature || 0.7,
          topP: input.parameters?.top_p || 1,
          maxOutputTokens: input.parameters?.max_tokens || 1000
        }
      }

      const response = await fetch(
        `${this.baseUrl}/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      )

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
      }

      const data: GeminiResponse = await response.json()

      const firstCandidate = data.candidates?.[0]
      const responseText = firstCandidate?.content?.parts?.[0]?.text
      
      if (!responseText) {
        throw new Error('Invalid response format from Gemini API')
      }

      return {
        response: responseText,
        confidence_score: this.calculateConfidence(data)
      }
    } catch (error) {
      throw this.handleError(error, { input, model })
    }
  }

  estimateTokens(text: string): number {
    // Rough estimation for Gemini
    return Math.ceil(text.length / 4)
  }

  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = this.provider.pricing[model]
    if (!pricing) return 0

    return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
  }

  private calculateConfidence(response: GeminiResponse): number {
    const candidate = response.candidates?.[0]
    if (!candidate) return 50
    
    if (candidate.finishReason === 'STOP') return 85
    if (candidate.finishReason === 'MAX_TOKENS') return 70
    return 60
  }
}

// AI Service Factory
export class AIServiceFactory {
  private static services: Map<string, BaseAIService> = new Map()

  static createService(
    provider: AIProviderType,
    apiKey: string,
    baseUrl?: string
  ): BaseAIService {
    const serviceKey = `${provider}_${apiKey.slice(-8)}`
    
    if (this.services.has(serviceKey)) {
      return this.services.get(serviceKey)!
    }

    let service: BaseAIService

    switch (provider) {
      case 'openai':
        service = new OpenAIService(apiKey)
        break
      case 'claude':
        service = new ClaudeService(apiKey)
        break
      case 'gemini':
        service = new GeminiService(apiKey)
        break
      default:
        throw new Error(`Unsupported AI provider: ${provider}`)
    }

    this.services.set(serviceKey, service)
    return service
  }

  static clearCache(): void {
    this.services.clear()
  }
}

// Helper functions
export function getAvailableProviders(): AIProvider[] {
  return Object.values(AI_PROVIDERS)
}

export function getProviderByType(type: AIProviderType): AIProvider {
  return AI_PROVIDERS[type]
}

export function getDefaultModel(provider: AIProviderType): string {
  const providerConfig = AI_PROVIDERS[provider]
  const defaultModel = providerConfig.models.find(m => m.isDefault)
  return defaultModel?.id || providerConfig.models[0].id
}

export function validateProviderSupportsFeature(
  provider: AIProviderType,
  feature: AIFeature
): boolean {
  return AI_PROVIDERS[provider].features.includes(feature)
}

export function estimateCostForSession(
  provider: AIProviderType,
  model: string,
  inputText: string,
  expectedOutputLength: number = 500
): number {
  const service = AIServiceFactory.createService(provider, 'dummy-key')
  const inputTokens = service.estimateTokens(inputText)
  const outputTokens = service.estimateTokens('x'.repeat(expectedOutputLength))
  
  return service.calculateCost(inputTokens, outputTokens, model)
}

export function selectBestProvider(
  requirements: {
    features: AIFeature[]
    maxCost?: number
    maxLatency?: number
    preferAccuracy?: boolean
  }
): AIProviderType {
  const providers = Object.values(AI_PROVIDERS)
  
  // Filter providers that support all required features
  const compatibleProviders = providers.filter(provider =>
    requirements.features.every((feature: AIFeature) => 
      provider.features.includes(feature)
    )
  )

  if (compatibleProviders.length === 0) {
    throw new Error('No compatible AI providers found for the given requirements')
  }

  // Simple scoring algorithm (can be made more sophisticated)
  let bestProvider = compatibleProviders[0]
  let bestScore = 0

  for (const provider of compatibleProviders) {
    let score = 0
    
    // Cost efficiency (lower cost = higher score)
    const avgCost = Object.values(provider.pricing).reduce((sum, pricing) => 
      sum + (pricing.input + pricing.output) / 2, 0
    ) / Object.keys(provider.pricing).length
    score += (1 / avgCost) * 100

    // Feature completeness
    score += provider.features.length * 10

    // Accuracy preference (Claude > GPT-4 > Gemini for reasoning tasks)
    if (requirements.preferAccuracy) {
      if (provider.id === 'claude') score += 50
      else if (provider.id === 'openai') score += 30
      else if (provider.id === 'gemini') score += 20
    }

    if (score > bestScore) {
      bestScore = score
      bestProvider = provider
    }
  }

  return bestProvider.id
}