// AI Service Clients with Error Handling

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getAIConfig } from './config';
import { handleAIError, ProviderUnavailableError } from './errors';
import { AIRequest, AIResponse, AIProvider, ProviderHealth } from './types';

export class AIClients {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private config = getAIConfig();
  private healthStatus: Map<AIProvider, ProviderHealth> = new Map();

  constructor() {
    this.initializeClients();
    this.startHealthChecks();
  }

  private initializeClients(): void {
    // Initialize OpenAI client
    if (this.config.openai.apiKey) {
      try {
        this.openaiClient = new OpenAI({
          apiKey: this.config.openai.apiKey,
        });
        console.log('OpenAI client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize OpenAI client:', error);
      }
    }

    // Initialize Anthropic client
    if (this.config.anthropic.apiKey) {
      try {
        this.anthropicClient = new Anthropic({
          apiKey: this.config.anthropic.apiKey,
        });
        console.log('Anthropic client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Anthropic client:', error);
      }
    }
  }

  private startHealthChecks(): void {
    // Initialize health status
    if (this.openaiClient) {
      this.healthStatus.set('openai', {
        provider: 'openai',
        status: 'healthy',
        responseTime: 0,
        errorRate: 0,
        lastCheck: new Date(),
      });
    }

    if (this.anthropicClient) {
      this.healthStatus.set('anthropic', {
        provider: 'anthropic',
        status: 'healthy',
        responseTime: 0,
        errorRate: 0,
        lastCheck: new Date(),
      });
    }

    // Run health checks every 5 minutes
    setInterval(() => {
      this.performHealthChecks();
    }, 5 * 60 * 1000);
  }

  private async performHealthChecks(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.openaiClient) {
      promises.push(this.checkOpenAIHealth());
    }

    if (this.anthropicClient) {
      promises.push(this.checkAnthropicHealth());
    }

    await Promise.allSettled(promises);
  }

  private async checkOpenAIHealth(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.openaiClient!.models.list();
      const responseTime = Date.now() - startTime;
      
      this.healthStatus.set('openai', {
        provider: 'openai',
        status: 'healthy',
        responseTime,
        errorRate: 0,
        lastCheck: new Date(),
      });
    } catch (error) {
      this.healthStatus.set('openai', {
        provider: 'openai',
        status: 'down',
        responseTime: Date.now() - startTime,
        errorRate: 1,
        lastCheck: new Date(),
      });
    }
  }

  private async checkAnthropicHealth(): Promise<void> {
    const startTime = Date.now();
    try {
      // Simple health check - attempt to create a minimal completion
      await this.anthropicClient!.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      
      const responseTime = Date.now() - startTime;
      
      this.healthStatus.set('anthropic', {
        provider: 'anthropic',
        status: 'healthy',
        responseTime,
        errorRate: 0,
        lastCheck: new Date(),
      });
    } catch (error) {
      this.healthStatus.set('anthropic', {
        provider: 'anthropic',
        status: 'down',
        responseTime: Date.now() - startTime,
        errorRate: 1,
        lastCheck: new Date(),
      });
    }
  }

  public async generateCompletion(request: AIRequest, preferredProvider?: AIProvider): Promise<AIResponse> {
    const startTime = Date.now();
    let provider = preferredProvider || this.selectBestProvider();
    let lastError: Error | null = null;

    // Try primary provider
    try {
      const response = await this.callProvider(provider, request);
      return {
        ...response,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error as Error;
      console.warn(`Primary provider ${provider} failed:`, error);
    }

    // Try fallback provider if enabled
    if (this.config.fallback.enabled) {
      const fallbackProvider = provider === 'openai' ? 'anthropic' : 'openai';
      
      if (this.isProviderAvailable(fallbackProvider)) {
        try {
          console.log(`Falling back to ${fallbackProvider}`);
          const response = await this.callProvider(fallbackProvider, request);
          return {
            ...response,
            processingTime: Date.now() - startTime,
          };
        } catch (fallbackError) {
          console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
          lastError = fallbackError as Error;
        }
      }
    }

    // If all providers failed, throw the last error
    throw handleAIError(lastError, provider, request.id);
  }

  private selectBestProvider(): AIProvider {
    const openaiHealth = this.healthStatus.get('openai');
    const anthropicHealth = this.healthStatus.get('anthropic');

    // If only one provider is available, use it
    if (!openaiHealth && anthropicHealth) return 'anthropic';
    if (openaiHealth && !anthropicHealth) return 'openai';
    if (!openaiHealth && !anthropicHealth) {
      throw new ProviderUnavailableError('No AI providers available');
    }

    // Select based on health status and response time
    if (openaiHealth!.status === 'healthy' && anthropicHealth!.status !== 'healthy') {
      return 'openai';
    }
    if (anthropicHealth!.status === 'healthy' && openaiHealth!.status !== 'healthy') {
      return 'anthropic';
    }

    // Both healthy, select based on response time
    return openaiHealth!.responseTime <= anthropicHealth!.responseTime ? 'openai' : 'anthropic';
  }

  private isProviderAvailable(provider: AIProvider): boolean {
    if (provider === 'openai') return !!this.openaiClient;
    if (provider === 'anthropic') return !!this.anthropicClient;
    return false;
  }

  private async callProvider(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    if (provider === 'openai') {
      return this.callOpenAI(request);
    } else if (provider === 'anthropic') {
      return this.callAnthropic(request);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async callOpenAI(request: AIRequest): Promise<AIResponse> {
    if (!this.openaiClient) {
      throw new ProviderUnavailableError('OpenAI client not initialized', 'openai', request.id);
    }

    try {
      const completion = await this.openaiClient.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        max_tokens: this.config.openai.maxTokens,
        temperature: this.config.openai.temperature,
      });

      const choice = completion.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      return {
        id: crypto.randomUUID(),
        requestId: request.id,
        content: choice.message.content,
        provider: 'openai',
        model: this.config.openai.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        timestamp: new Date(),
        processingTime: 0, // Will be set by caller
      };
    } catch (error) {
      throw handleAIError(error, 'openai', request.id);
    }
  }

  private async callAnthropic(request: AIRequest): Promise<AIResponse> {
    if (!this.anthropicClient) {
      throw new ProviderUnavailableError('Anthropic client not initialized', 'anthropic', request.id);
    }

    try {
      const message = await this.anthropicClient.messages.create({
        model: this.config.anthropic.model,
        max_tokens: this.config.anthropic.maxTokens,
        temperature: this.config.anthropic.temperature,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected content type from Anthropic');
      }

      return {
        id: crypto.randomUUID(),
        requestId: request.id,
        content: content.text,
        provider: 'anthropic',
        model: this.config.anthropic.model,
        usage: {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        },
        timestamp: new Date(),
        processingTime: 0, // Will be set by caller
      };
    } catch (error) {
      throw handleAIError(error, 'anthropic', request.id);
    }
  }

  public getHealthStatus(): Map<AIProvider, ProviderHealth> {
    return new Map(this.healthStatus);
  }

  public async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.openaiClient) {
      console.warn('OpenAI client not available for embedding generation');
      return null;
    }

    try {
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0]?.embedding || null;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return null;
    }
  }

  public getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    if (this.openaiClient) providers.push('openai');
    if (this.anthropicClient) providers.push('anthropic');
    return providers;
  }
}

// Singleton instance
let aiClientsInstance: AIClients | null = null;

export function getAIClients(): AIClients {
  if (!aiClientsInstance) {
    aiClientsInstance = new AIClients();
  }
  return aiClientsInstance;
}