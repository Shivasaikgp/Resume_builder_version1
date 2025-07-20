// Content Generation AI Agent
// Provides intelligent content suggestions and enhancements for resume building

import { getAIClients } from '../clients';
import { AIRequest } from '../types';
import { 
  ResumeData, 
  UserContext, 
  ContentSuggestion, 
  ExperienceItem,
  PersonalInfo 
} from '../../../types';

export interface ContentGenerationOptions {
  maxSuggestions?: number;
  includeReasoning?: boolean;
  contextWeight?: number;
}

export interface JobSpecificContext {
  jobTitle: string;
  company: string;
  industry?: string;
  jobDescription?: string;
}

export interface ContentEnhancementRequest {
  content: string;
  section: 'experience' | 'skills' | 'summary' | 'achievements';
  context: UserContext;
  targetJob?: JobSpecificContext;
}

export class ContentGenerationAgent {
  private aiClients = getAIClients();
  
  // Action verbs categorized by impact level and industry
  private readonly actionVerbs = {
    leadership: [
      'Led', 'Directed', 'Managed', 'Supervised', 'Coordinated', 'Orchestrated',
      'Spearheaded', 'Championed', 'Guided', 'Mentored', 'Facilitated', 'Oversaw'
    ],
    achievement: [
      'Achieved', 'Accomplished', 'Delivered', 'Exceeded', 'Surpassed', 'Attained',
      'Secured', 'Generated', 'Increased', 'Improved', 'Optimized', 'Enhanced'
    ],
    technical: [
      'Developed', 'Implemented', 'Designed', 'Built', 'Created', 'Engineered',
      'Architected', 'Programmed', 'Configured', 'Deployed', 'Integrated', 'Automated'
    ],
    analytical: [
      'Analyzed', 'Evaluated', 'Assessed', 'Investigated', 'Researched', 'Examined',
      'Identified', 'Diagnosed', 'Measured', 'Calculated', 'Forecasted', 'Modeled'
    ],
    communication: [
      'Presented', 'Communicated', 'Collaborated', 'Negotiated', 'Consulted', 'Advised',
      'Trained', 'Educated', 'Documented', 'Reported', 'Articulated', 'Influenced'
    ]
  };

  /**
   * Generate contextually relevant content suggestions for any resume section
   */
  async generateSuggestions(
    context: UserContext,
    section: string,
    currentContent?: string,
    options: ContentGenerationOptions = {}
  ): Promise<ContentSuggestion[]> {
    const {
      maxSuggestions = 5,
      includeReasoning = true,
      contextWeight = 0.8
    } = options;

    const prompt = this.buildSuggestionPrompt(context, section, currentContent, contextWeight);
    
    const request: AIRequest = {
      id: crypto.randomUUID(),
      type: 'content-generation',
      prompt,
      context: { section, currentContent, userContext: context },
      userId: context.profile?.industry || 'anonymous',
      priority: 'normal',
      timestamp: new Date(),
      metadata: { maxSuggestions, includeReasoning }
    };

    try {
      const response = await this.aiClients.generateCompletion(request);
      return this.parseSuggestions(response.content, includeReasoning);
    } catch (error) {
      console.error('Content generation failed:', error);
      // Fallback to rule-based suggestions
      return this.generateFallbackSuggestions(section, currentContent, context);
    }
  }

  /**
   * Enhance existing content with AI-powered improvements
   */
  async enhanceContent(
    enhancementRequest: ContentEnhancementRequest
  ): Promise<string> {
    const { content, section, context, targetJob } = enhancementRequest;
    
    const prompt = this.buildEnhancementPrompt(content, section, context, targetJob);
    
    const request: AIRequest = {
      id: crypto.randomUUID(),
      type: 'content-generation',
      prompt,
      context: { section, originalContent: content, userContext: context, targetJob },
      userId: context.profile?.industry || 'anonymous',
      priority: 'normal',
      timestamp: new Date()
    };

    try {
      const response = await this.aiClients.generateCompletion(request);
      return this.extractEnhancedContent(response.content);
    } catch (error) {
      console.error('Content enhancement failed:', error);
      // Return original content with basic improvements
      return this.applyBasicEnhancements(content, section);
    }
  }

  /**
   * Generate job-specific bullet points based on job title and company
   */
  async generateBulletPoints(
    jobTitle: string,
    company: string,
    experienceLevel?: string,
    industry?: string
  ): Promise<string[]> {
    const prompt = this.buildJobSpecificPrompt(jobTitle, company, experienceLevel, industry);
    
    const request: AIRequest = {
      id: crypto.randomUUID(),
      type: 'content-generation',
      prompt,
      context: { jobTitle, company, experienceLevel, industry },
      userId: 'job-specific-generation',
      priority: 'normal',
      timestamp: new Date()
    };

    try {
      const response = await this.aiClients.generateCompletion(request);
      return this.extractBulletPoints(response.content);
    } catch (error) {
      console.error('Job-specific content generation failed:', error);
      // Fallback to template-based bullet points
      return this.generateTemplateBulletPoints(jobTitle, company);
    }
  }

  /**
   * Get real-time action verb suggestions based on context
   */
  getActionVerbSuggestions(
    currentText: string,
    context: UserContext,
    maxSuggestions: number = 8
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    const experienceLevel = context.profile?.experienceLevel || 'mid';
    const industry = context.profile?.industry || '';
    
    // Determine appropriate verb categories based on context
    const categories = this.selectVerbCategories(currentText, experienceLevel, industry);
    
    categories.forEach(category => {
      const verbs = this.actionVerbs[category as keyof typeof this.actionVerbs] || [];
      verbs.slice(0, Math.ceil(maxSuggestions / categories.length)).forEach(verb => {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'bullet_point',
          content: verb,
          context: `Strong ${category} action verb`,
          confidence: this.calculateVerbConfidence(verb, currentText, context),
          reasoning: `${verb} is a powerful ${category} verb that demonstrates impact and leadership`
        });
      });
    });

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);
  }

  /**
   * Generate achievement-focused suggestions with quantifiable metrics
   */
  async generateAchievementSuggestions(
    experienceItem: ExperienceItem,
    context: UserContext
  ): Promise<ContentSuggestion[]> {
    const prompt = this.buildAchievementPrompt(experienceItem, context);
    
    const request: AIRequest = {
      id: crypto.randomUUID(),
      type: 'content-generation',
      prompt,
      context: { experienceItem, userContext: context },
      userId: context.profile?.industry || 'anonymous',
      priority: 'normal',
      timestamp: new Date()
    };

    try {
      const response = await this.aiClients.generateCompletion(request);
      return this.parseAchievementSuggestions(response.content);
    } catch (error) {
      console.error('Achievement generation failed:', error);
      return this.generateTemplateAchievements(experienceItem);
    }
  }

  // Private helper methods

  private buildSuggestionPrompt(
    context: UserContext,
    section: string,
    currentContent?: string,
    contextWeight: number = 0.8
  ): string {
    const profile = context.profile;
    const preferences = context.preferences;
    
    return `
You are an expert resume writer helping to generate compelling content suggestions.

User Context:
- Industry: ${profile?.industry || 'General'}
- Experience Level: ${profile?.experienceLevel || 'Mid-level'}
- Target Roles: ${profile?.targetRoles?.join(', ') || 'Various'}
- Writing Style: ${preferences?.writingStyle || 'Professional'}
- Content Length: ${preferences?.contentLength || 'Detailed'}

Section: ${section}
Current Content: ${currentContent || 'None provided'}

Generate 5 specific, actionable content suggestions for this resume section. Each suggestion should:
1. Be tailored to the user's industry and experience level
2. Use strong action verbs and quantifiable achievements where possible
3. Be ATS-friendly with relevant keywords
4. Match the user's preferred writing style
5. Be specific and impactful

Format your response as a JSON array of objects with this structure:
{
  "type": "bullet_point" | "skill" | "achievement" | "keyword",
  "content": "The actual suggestion text",
  "context": "Brief explanation of why this suggestion fits",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation of the suggestion's value"
}
`;
  }

  private buildEnhancementPrompt(
    content: string,
    section: string,
    context: UserContext,
    targetJob?: JobSpecificContext
  ): string {
    const profile = context.profile;
    const jobContext = targetJob ? `
Target Job: ${targetJob.jobTitle} at ${targetJob.company}
Industry: ${targetJob.industry || 'Not specified'}
Job Description Keywords: ${targetJob.jobDescription ? 'Provided' : 'Not provided'}
` : '';

    return `
You are an expert resume writer. Enhance the following content to make it more compelling and ATS-friendly.

User Profile:
- Experience Level: ${profile?.experienceLevel || 'Mid-level'}
- Industry: ${profile?.industry || 'General'}
- Writing Style: ${context.preferences?.writingStyle || 'Professional'}

${jobContext}

Section: ${section}
Original Content: ${content}

Enhance this content by:
1. Using stronger action verbs
2. Adding quantifiable metrics where appropriate
3. Improving clarity and impact
4. Incorporating relevant keywords
5. Maintaining the user's preferred writing style

Return only the enhanced content, no additional formatting or explanations.
`;
  }

  private buildJobSpecificPrompt(
    jobTitle: string,
    company: string,
    experienceLevel?: string,
    industry?: string
  ): string {
    return `
Generate 5-7 professional bullet points for a ${jobTitle} position at ${company}.

Context:
- Experience Level: ${experienceLevel || 'Mid-level'}
- Industry: ${industry || 'General'}
- Company: ${company}

Each bullet point should:
1. Start with a strong action verb
2. Include specific, quantifiable achievements where possible
3. Be relevant to the ${jobTitle} role
4. Demonstrate impact and value
5. Be ATS-friendly with industry keywords

Format as a simple list, one bullet point per line, starting with "•".
`;
  }

  private buildAchievementPrompt(
    experienceItem: ExperienceItem,
    context: UserContext
  ): string {
    return `
Generate achievement-focused bullet points for this work experience:

Position: ${experienceItem.title}
Company: ${experienceItem.company}
Duration: ${experienceItem.startDate} - ${experienceItem.endDate || 'Present'}
Current Description: ${experienceItem.description?.join('; ') || 'None provided'}

User Context:
- Experience Level: ${context.profile?.experienceLevel || 'Mid-level'}
- Industry: ${context.profile?.industry || 'General'}

Create 3-5 achievement-focused bullet points that:
1. Quantify impact with numbers, percentages, or metrics
2. Show progression and growth
3. Highlight leadership and initiative
4. Use industry-relevant keywords
5. Demonstrate value delivered to the organization

Format as JSON array with structure:
{
  "content": "The bullet point text",
  "type": "achievement",
  "confidence": 0.0-1.0,
  "context": "Brief explanation of the achievement's significance"
}
`;
  }

  private parseSuggestions(content: string, includeReasoning: boolean): ContentSuggestion[] {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed.map(item => ({
        id: crypto.randomUUID(),
        type: item.type || 'bullet_point',
        content: item.content,
        context: item.context || '',
        confidence: item.confidence || 0.8,
        reasoning: includeReasoning ? item.reasoning : undefined
      })) : [];
    } catch (error) {
      console.error('Failed to parse AI suggestions:', error);
      return [];
    }
  }

  private parseAchievementSuggestions(content: string): ContentSuggestion[] {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed.map(item => ({
        id: crypto.randomUUID(),
        type: 'achievement',
        content: item.content,
        context: item.context || 'Achievement-focused bullet point',
        confidence: item.confidence || 0.8
      })) : [];
    } catch (error) {
      console.error('Failed to parse achievement suggestions:', error);
      return [];
    }
  }

  private extractEnhancedContent(content: string): string {
    // Remove any markdown formatting or extra text
    return content
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .replace(/^Enhanced content:\s*/i, '')
      .trim();
  }

  private extractBulletPoints(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))
      .map(line => line.replace(/^[•\-*]\s*/, ''))
      .filter(line => line.length > 0);
  }

  private selectVerbCategories(
    currentText: string,
    experienceLevel: string,
    industry: string
  ): string[] {
    const categories = ['achievement', 'technical'];
    
    if (experienceLevel === 'senior' || experienceLevel === 'executive') {
      categories.push('leadership');
    }
    
    if (industry.toLowerCase().includes('tech') || industry.toLowerCase().includes('software')) {
      categories.push('technical');
    }
    
    if (currentText.toLowerCase().includes('analy') || currentText.toLowerCase().includes('research')) {
      categories.push('analytical');
    }
    
    categories.push('communication');
    
    return [...new Set(categories)];
  }

  private calculateVerbConfidence(
    verb: string,
    currentText: string,
    context: UserContext
  ): number {
    let confidence = 0.7; // Base confidence
    
    // Boost confidence if verb matches user's experience level
    const experienceLevel = context.profile?.experienceLevel;
    if (experienceLevel === 'senior' && this.actionVerbs.leadership.includes(verb)) {
      confidence += 0.2;
    }
    
    // Reduce confidence if verb is already used in current text
    if (currentText.toLowerCase().includes(verb.toLowerCase())) {
      confidence -= 0.3;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private generateFallbackSuggestions(
    section: string,
    currentContent?: string,
    context?: UserContext
  ): ContentSuggestion[] {
    // Rule-based fallback suggestions
    const suggestions: ContentSuggestion[] = [];
    
    if (section === 'experience') {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'bullet_point',
        content: 'Led cross-functional team to deliver project ahead of schedule',
        context: 'Leadership and project management',
        confidence: 0.7
      });
    }
    
    return suggestions;
  }

  private applyBasicEnhancements(content: string, section: string): string {
    // Basic rule-based enhancements
    let enhanced = content;
    
    // Replace weak verbs with stronger alternatives
    const verbReplacements: Record<string, string> = {
      'helped': 'assisted',
      'worked on': 'contributed to',
      'did': 'executed',
      'made': 'created'
    };
    
    Object.entries(verbReplacements).forEach(([weak, strong]) => {
      enhanced = enhanced.replace(new RegExp(`\\b${weak}\\b`, 'gi'), strong);
    });
    
    return enhanced;
  }

  private generateTemplateBulletPoints(jobTitle: string, company: string): string[] {
    // Template-based bullet points as fallback
    return [
      `Contributed to key initiatives at ${company} in ${jobTitle} role`,
      'Collaborated with cross-functional teams to achieve project objectives',
      'Demonstrated strong problem-solving and analytical skills',
      'Maintained high standards of quality and attention to detail'
    ];
  }

  private generateTemplateAchievements(experienceItem: ExperienceItem): ContentSuggestion[] {
    return [
      {
        id: crypto.randomUUID(),
        type: 'achievement',
        content: `Delivered key results in ${experienceItem.title} role at ${experienceItem.company}`,
        context: 'General achievement template',
        confidence: 0.6
      }
    ];
  }
}

// Singleton instance
let contentGenerationAgentInstance: ContentGenerationAgent | null = null;

export function getContentGenerationAgent(): ContentGenerationAgent {
  if (!contentGenerationAgentInstance) {
    contentGenerationAgentInstance = new ContentGenerationAgent();
  }
  return contentGenerationAgentInstance;
}