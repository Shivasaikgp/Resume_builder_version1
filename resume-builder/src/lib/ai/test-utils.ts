// AI Service Test Utilities

import { getAIConfig, validateAIConfig } from './config';
import { getAIClients } from './clients';
import { getAIQueue } from './queue';
import { AIRequest } from './types';

export class AIServiceTester {
  private config = getAIConfig();
  private clients = getAIClients();
  private queue = getAIQueue();

  /**
   * Test AI service configuration
   */
  public testConfiguration(): { valid: boolean; errors: string[] } {
    const errors = validateAIConfig(this.config);
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test AI provider connectivity
   */
  public async testConnectivity(): Promise<{
    openai: { available: boolean; healthy: boolean; error?: string };
    anthropic: { available: boolean; healthy: boolean; error?: string };
  }> {
    const availableProviders = this.clients.getAvailableProviders();
    const healthStatus = this.clients.getHealthStatus();

    const result = {
      openai: {
        available: availableProviders.includes('openai'),
        healthy: false,
        error: undefined as string | undefined,
      },
      anthropic: {
        available: availableProviders.includes('anthropic'),
        healthy: false,
        error: undefined as string | undefined,
      },
    };

    // Check OpenAI health
    const openaiHealth = healthStatus.get('openai');
    if (openaiHealth) {
      result.openai.healthy = openaiHealth.status === 'healthy';
      if (openaiHealth.status !== 'healthy') {
        result.openai.error = `Status: ${openaiHealth.status}, Response time: ${openaiHealth.responseTime}ms`;
      }
    } else if (result.openai.available) {
      result.openai.error = 'Provider available but no health status';
    }

    // Check Anthropic health
    const anthropicHealth = healthStatus.get('anthropic');
    if (anthropicHealth) {
      result.anthropic.healthy = anthropicHealth.status === 'healthy';
      if (anthropicHealth.status !== 'healthy') {
        result.anthropic.error = `Status: ${anthropicHealth.status}, Response time: ${anthropicHealth.responseTime}ms`;
      }
    } else if (result.anthropic.available) {
      result.anthropic.error = 'Provider available but no health status';
    }

    return result;
  }

  /**
   * Test content generation with a simple prompt
   */
  public async testContentGeneration(prompt: string = 'Hello, world!'): Promise<{
    success: boolean;
    response?: any;
    error?: string;
    processingTime?: number;
  }> {
    try {
      const request: AIRequest = {
        id: `test-${Date.now()}`,
        type: 'content-generation',
        prompt,
        userId: 'test-user',
        priority: 'normal',
        timestamp: new Date(),
      };

      const startTime = Date.now();
      const response = await this.queue.addRequest(request);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        response: {
          id: response.id,
          content: response.content,
          provider: response.provider,
          model: response.model,
          usage: response.usage,
        },
        processingTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test rate limiting
   */
  public async testRateLimit(userId: string = 'test-user'): Promise<{
    requestsRemaining: number;
    resetTime: Date;
    isLimited: boolean;
  }> {
    return this.queue.getRateLimitStatus(userId);
  }

  /**
   * Get queue status
   */
  public getQueueStatus() {
    return this.queue.getQueueStatus();
  }

  /**
   * Run comprehensive AI service test
   */
  public async runComprehensiveTest(): Promise<{
    configuration: { valid: boolean; errors: string[] };
    connectivity: any;
    contentGeneration: any;
    rateLimit: any;
    queueStatus: any;
    summary: {
      allTestsPassed: boolean;
      issues: string[];
    };
  }> {
    const issues: string[] = [];

    // Test configuration
    const configTest = this.testConfiguration();
    if (!configTest.valid) {
      issues.push(`Configuration issues: ${configTest.errors.join(', ')}`);
    }

    // Test connectivity
    const connectivityTest = await this.testConnectivity();
    if (!connectivityTest.openai.available && !connectivityTest.anthropic.available) {
      issues.push('No AI providers are available');
    }
    if (connectivityTest.openai.available && !connectivityTest.openai.healthy) {
      issues.push(`OpenAI is not healthy: ${connectivityTest.openai.error}`);
    }
    if (connectivityTest.anthropic.available && !connectivityTest.anthropic.healthy) {
      issues.push(`Anthropic is not healthy: ${connectivityTest.anthropic.error}`);
    }

    // Test content generation (only if providers are available)
    let contentTest = { success: false, error: 'No providers available' };
    if (connectivityTest.openai.available || connectivityTest.anthropic.available) {
      contentTest = await this.testContentGeneration('Test prompt for AI service validation');
      if (!contentTest.success) {
        issues.push(`Content generation failed: ${contentTest.error}`);
      }
    }

    // Test rate limiting
    const rateLimitTest = await this.testRateLimit();

    // Get queue status
    const queueStatus = this.getQueueStatus();

    return {
      configuration: configTest,
      connectivity: connectivityTest,
      contentGeneration: contentTest,
      rateLimit: rateLimitTest,
      queueStatus,
      summary: {
        allTestsPassed: issues.length === 0,
        issues,
      },
    };
  }
}

// Export singleton instance
export const aiServiceTester = new AIServiceTester();

// Utility function for quick testing
export async function quickAITest(): Promise<void> {
  console.log('🤖 Running AI Service Test...\n');

  const results = await aiServiceTester.runComprehensiveTest();

  console.log('📋 Configuration:', results.configuration.valid ? '✅ Valid' : '❌ Invalid');
  if (!results.configuration.valid) {
    results.configuration.errors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n🔗 Connectivity:');
  console.log(`   OpenAI: ${results.connectivity.openai.available ? '✅' : '❌'} Available, ${results.connectivity.openai.healthy ? '✅' : '❌'} Healthy`);
  if (results.connectivity.openai.error) {
    console.log(`     Error: ${results.connectivity.openai.error}`);
  }
  console.log(`   Anthropic: ${results.connectivity.anthropic.available ? '✅' : '❌'} Available, ${results.connectivity.anthropic.healthy ? '✅' : '❌'} Healthy`);
  if (results.connectivity.anthropic.error) {
    console.log(`     Error: ${results.connectivity.anthropic.error}`);
  }

  console.log('\n💬 Content Generation:', results.contentGeneration.success ? '✅ Success' : '❌ Failed');
  if (results.contentGeneration.success) {
    console.log(`   Provider: ${results.contentGeneration.response.provider}`);
    console.log(`   Processing Time: ${results.contentGeneration.processingTime}ms`);
    console.log(`   Content Preview: ${results.contentGeneration.response.content.substring(0, 100)}...`);
  } else {
    console.log(`   Error: ${results.contentGeneration.error}`);
  }

  console.log('\n⏱️ Rate Limiting:');
  console.log(`   Requests Remaining: ${results.rateLimit.requestsRemaining}`);
  console.log(`   Reset Time: ${results.rateLimit.resetTime.toLocaleTimeString()}`);
  console.log(`   Currently Limited: ${results.rateLimit.isLimited ? '❌ Yes' : '✅ No'}`);

  console.log('\n📊 Queue Status:');
  console.log(`   Pending: ${results.queueStatus.pending}`);
  console.log(`   Processing: ${results.queueStatus.processing}`);
  console.log(`   Completed: ${results.queueStatus.completed}`);
  console.log(`   Failed: ${results.queueStatus.failed}`);

  console.log('\n📝 Summary:', results.summary.allTestsPassed ? '✅ All tests passed!' : '❌ Issues found');
  if (!results.summary.allTestsPassed) {
    results.summary.issues.forEach(issue => console.log(`   - ${issue}`));
  }

  console.log('\n🎯 Next Steps:');
  if (!results.configuration.valid) {
    console.log('   1. Fix configuration issues in .env file');
  }
  if (!results.connectivity.openai.available && !results.connectivity.anthropic.available) {
    console.log('   2. Add API keys for OpenAI or Anthropic in .env file');
  }
  if (results.summary.allTestsPassed) {
    console.log('   🚀 AI service is ready to use!');
  }
}