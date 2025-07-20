// Context Management AI Agent
// Builds comprehensive user profiles, learns from interactions, and provides personalized recommendations

import { getAIClients } from '../clients';
import { AIRequest } from '../types';
import { 
  UserContext, 
  UserProfile, 
  UserPreferences, 
  UserInteraction,
  ResumeData,
  ContentSuggestion 
} from '../../../types';
import { prisma } from '../../prisma';
import { VectorStore } from '../vector-store';

export interface ContextLearningOptions {
  learningRate?: number;
  contextWindow?: number;
  adaptationThreshold?: number;
}

export interface PersonalizedRecommendation {
  id: string;
  type: 'content' | 'template' | 'workflow' | 'career';
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
  actionable: boolean;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ContextInsight {
  type: 'pattern' | 'preference' | 'skill_gap' | 'career_trend';
  insight: string;
  confidence: number;
  evidence: string[];
  actionable: boolean;
}

export interface UserContextProfile {
  userId: string;
  profile: UserProfile;
  preferences: UserPreferences;
  behaviorPatterns: BehaviorPattern[];
  skillProgression: SkillProgression[];
  careerTrajectory: CareerTrajectory;
  contextVector: number[];
  lastUpdated: Date;
}

export interface BehaviorPattern {
  type: 'suggestion_acceptance' | 'content_style' | 'workflow_preference' | 'timing_pattern';
  pattern: string;
  frequency: number;
  confidence: number;
  examples: string[];
}

export interface SkillProgression {
  skill: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  trajectory: 'improving' | 'stable' | 'declining';
  evidence: string[];
  recommendations: string[];
}

export interface CareerTrajectory {
  currentLevel: 'entry' | 'mid' | 'senior' | 'executive';
  targetLevel: 'entry' | 'mid' | 'senior' | 'executive';
  industry: string;
  roles: string[];
  progression: 'upward' | 'lateral' | 'transitioning';
  timeframe: string;
  gaps: string[];
}

export class ContextAgent {
  private aiClients = getAIClients();
  private vectorStore: VectorStore;
  private contextCache = new Map<string, UserContextProfile>();
  
  constructor() {
    this.vectorStore = new VectorStore();
  }

  /**
   * Build comprehensive user context profile from all available data
   */
  async buildUserContext(userId: string): Promise<UserContext> {
    try {
      // Get existing context from database
      const existingContext = await this.getStoredContext(userId);
      
      // Get user's resumes for analysis
      const userResumes = await this.getUserResumes(userId);
      
      // Get user interactions history
      const interactions = await this.getUserInteractions(userId);
      
      // Analyze and build comprehensive context
      const profile = await this.analyzeUserProfile(userId, userResumes, interactions, existingContext);
      const preferences = await this.analyzeUserPreferences(userId, interactions, existingContext);
      const behaviorPatterns = await this.analyzeBehaviorPatterns(interactions);
      
      // Build context vector for similarity matching
      const contextVector = await this.generateContextVector(profile, preferences, behaviorPatterns);
      
      const userContext: UserContext = {
        profile,
        preferences,
        history: {
          interactions: interactions.slice(-50), // Keep last 50 interactions
          feedbackPatterns: await this.extractFeedbackPatterns(interactions),
          improvementAreas: await this.identifyImprovementAreas(userResumes, interactions)
        }
      };

      // Store updated context
      await this.storeUserContext(userId, userContext, contextVector);
      
      // Cache for quick access
      this.contextCache.set(userId, {
        userId,
        profile,
        preferences,
        behaviorPatterns,
        skillProgression: await this.analyzeSkillProgression(userResumes, interactions),
        careerTrajectory: await this.analyzeCareerTrajectory(profile, userResumes),
        contextVector,
        lastUpdated: new Date()
      });

      return userContext;
      
    } catch (error) {
      console.error('Failed to build user context:', error);
      // Return minimal context as fallback
      return this.getMinimalContext();
    }
  }

  /**
   * Update user context based on new interaction
   */
  async updateContext(userId: string, interaction: UserInteraction): Promise<void> {
    try {
      // Get current context
      let currentContext = this.contextCache.get(userId);
      if (!currentContext) {
        const storedContext = await this.getStoredContext(userId);
        if (storedContext) {
          currentContext = await this.buildContextProfile(userId, storedContext);
        }
      }

      if (!currentContext) {
        // Build initial context if none exists
        await this.buildUserContext(userId);
        return;
      }

      // Store the interaction
      await this.storeInteraction(userId, interaction);

      // Update context based on interaction type
      const updatedContext = await this.processInteractionUpdate(currentContext, interaction);
      
      // Regenerate context vector
      const newContextVector = await this.generateContextVector(
        updatedContext.profile,
        updatedContext.preferences,
        updatedContext.behaviorPatterns
      );

      // Update stored context
      const userContext: UserContext = {
        profile: updatedContext.profile,
        preferences: updatedContext.preferences,
        history: {
          interactions: [...(currentContext.profile ? [] : []), interaction],
          feedbackPatterns: await this.extractFeedbackPatterns([interaction]),
          improvementAreas: updatedContext.careerTrajectory.gaps
        }
      };

      await this.storeUserContext(userId, userContext, newContextVector);
      
      // Update cache
      this.contextCache.set(userId, {
        ...updatedContext,
        contextVector: newContextVector,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Failed to update user context:', error);
    }
  }

  /**
   * Get personalized recommendations based on user context
   */
  async getPersonalizedSuggestions(
    userId: string,
    context?: UserContext,
    currentResume?: ResumeData
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const userContext = context || await this.buildUserContext(userId);
      const contextProfile = this.contextCache.get(userId);
      
      if (!contextProfile) {
        return this.getGenericRecommendations();
      }

      // Generate AI-powered personalized recommendations
      const aiRecommendations = await this.generateAIRecommendations(
        contextProfile,
        userContext,
        currentResume
      );

      // Generate pattern-based recommendations
      const patternRecommendations = await this.generatePatternBasedRecommendations(
        contextProfile
      );

      // Generate career progression recommendations
      const careerRecommendations = await this.generateCareerRecommendations(
        contextProfile
      );

      // Combine and rank recommendations
      const allRecommendations = [
        ...aiRecommendations,
        ...patternRecommendations,
        ...careerRecommendations
      ];

      return this.rankRecommendations(allRecommendations, contextProfile);

    } catch (error) {
      console.error('Failed to generate personalized suggestions:', error);
      return this.getGenericRecommendations();
    }
  }

  /**
   * Find similar users for collaborative filtering
   */
  async findSimilarUsers(userId: string, limit: number = 5): Promise<string[]> {
    try {
      const userProfile = this.contextCache.get(userId);
      if (!userProfile) {
        return [];
      }

      return await this.vectorStore.findSimilarVectors(
        userProfile.contextVector,
        limit,
        userId // exclude current user
      );
    } catch (error) {
      console.error('Failed to find similar users:', error);
      return [];
    }
  }

  /**
   * Get context insights for user understanding
   */
  async getContextInsights(userId: string): Promise<ContextInsight[]> {
    try {
      const contextProfile = this.contextCache.get(userId);
      if (!contextProfile) {
        await this.buildUserContext(userId);
        return [];
      }

      const insights: ContextInsight[] = [];

      // Behavior pattern insights
      contextProfile.behaviorPatterns.forEach(pattern => {
        if (pattern.confidence > 0.7) {
          insights.push({
            type: 'pattern',
            insight: `User consistently ${pattern.pattern}`,
            confidence: pattern.confidence,
            evidence: pattern.examples,
            actionable: true
          });
        }
      });

      // Skill gap insights
      contextProfile.skillProgression.forEach(skill => {
        if (skill.recommendations.length > 0) {
          insights.push({
            type: 'skill_gap',
            insight: `${skill.skill} skill could be enhanced`,
            confidence: 0.8,
            evidence: skill.evidence,
            actionable: true
          });
        }
      });

      // Career trajectory insights
      if (contextProfile.careerTrajectory.gaps.length > 0) {
        insights.push({
          type: 'career_trend',
          insight: 'Career progression opportunities identified',
          confidence: 0.75,
          evidence: contextProfile.careerTrajectory.gaps,
          actionable: true
        });
      }

      return insights.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('Failed to get context insights:', error);
      return [];
    }
  }

  /**
   * Ensure context continuity across sessions
   */
  async ensureContextContinuity(userId: string): Promise<boolean> {
    try {
      // Check if context exists in cache
      if (this.contextCache.has(userId)) {
        const cached = this.contextCache.get(userId)!;
        const timeDiff = Date.now() - cached.lastUpdated.getTime();
        
        // If context is less than 1 hour old, it's still valid
        if (timeDiff < 3600000) {
          return true;
        }
      }

      // Rebuild context from stored data
      const storedContext = await this.getStoredContext(userId);
      if (storedContext) {
        const contextProfile = await this.buildContextProfile(userId, storedContext);
        this.contextCache.set(userId, contextProfile);
        return true;
      }

      // Build fresh context if none exists
      await this.buildUserContext(userId);
      return true;

    } catch (error) {
      console.error('Failed to ensure context continuity:', error);
      return false;
    }
  }

  // Private helper methods

  private async getStoredContext(userId: string): Promise<UserContext | null> {
    try {
      const stored = await prisma.userContext.findUnique({
        where: { userId }
      });
      
      return stored ? stored.contextData as UserContext : null;
    } catch (error) {
      console.error('Failed to get stored context:', error);
      return null;
    }
  }

  private async getUserResumes(userId: string): Promise<ResumeData[]> {
    try {
      const resumes = await prisma.resume.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      });
      
      return resumes.map(resume => resume.data as ResumeData);
    } catch (error) {
      console.error('Failed to get user resumes:', error);
      return [];
    }
  }

  private async getUserInteractions(userId: string): Promise<UserInteraction[]> {
    // In a real implementation, this would fetch from a dedicated interactions table
    // For now, we'll simulate based on resume updates and analysis requests
    try {
      const resumes = await prisma.resume.findMany({
        where: { userId },
        include: { analyses: true },
        orderBy: { updatedAt: 'desc' }
      });

      const interactions: UserInteraction[] = [];
      
      resumes.forEach(resume => {
        interactions.push({
          type: 'content_generated',
          timestamp: resume.createdAt.toISOString(),
          data: { resumeId: resume.id, action: 'created' }
        });

        resume.analyses.forEach(analysis => {
          interactions.push({
            type: 'analysis_requested',
            timestamp: analysis.createdAt.toISOString(),
            data: { resumeId: resume.id, score: analysis.score }
          });
        });
      });

      return interactions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Failed to get user interactions:', error);
      return [];
    }
  }

  private async analyzeUserProfile(
    userId: string,
    resumes: ResumeData[],
    interactions: UserInteraction[],
    existingContext?: UserContext
  ): Promise<UserProfile> {
    // Extract profile information from resumes and interactions
    const industries = new Set<string>();
    const roles = new Set<string>();
    const skills = new Set<string>();
    
    resumes.forEach(resume => {
      // Extract industry from experience
      resume.sections.forEach(section => {
        if (section.type === 'experience') {
          section.items.forEach(item => {
            if ('company' in item && 'title' in item) {
              roles.add(item.title);
              // Simple industry detection based on company/role
              if (item.title.toLowerCase().includes('software') || 
                  item.title.toLowerCase().includes('developer')) {
                industries.add('technology');
              }
            }
          });
        } else if (section.type === 'skills') {
          section.items.forEach(item => {
            if ('skills' in item && item.skills) {
              item.skills.forEach(skill => skills.add(skill));
            }
          });
        }
      });
    });

    // Determine experience level based on resume content
    const experienceLevel = this.determineExperienceLevel(resumes);
    
    return {
      industry: Array.from(industries)[0] || existingContext?.profile?.industry,
      experienceLevel: experienceLevel || existingContext?.profile?.experienceLevel,
      targetRoles: Array.from(roles).slice(0, 5),
      skills: Array.from(skills).slice(0, 20),
      careerGoals: existingContext?.profile?.careerGoals || []
    };
  }

  private async analyzeUserPreferences(
    userId: string,
    interactions: UserInteraction[],
    existingContext?: UserContext
  ): Promise<UserPreferences> {
    // Analyze interaction patterns to determine preferences
    let writingStyle: 'formal' | 'casual' | 'technical' = 'formal';
    let contentLength: 'concise' | 'detailed' = 'detailed';
    
    // Simple heuristics based on interaction patterns
    const analysisRequests = interactions.filter(i => i.type === 'analysis_requested').length;
    const contentGenerated = interactions.filter(i => i.type === 'content_generated').length;
    
    if (analysisRequests > contentGenerated) {
      writingStyle = 'technical';
    }

    return {
      writingStyle: existingContext?.preferences?.writingStyle || writingStyle,
      contentLength: existingContext?.preferences?.contentLength || contentLength,
      focusAreas: existingContext?.preferences?.focusAreas || []
    };
  }

  private async analyzeBehaviorPatterns(interactions: UserInteraction[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];
    
    // Analyze suggestion acceptance patterns
    const suggestionInteractions = interactions.filter(i => 
      i.type === 'suggestion_accepted' || i.type === 'suggestion_rejected'
    );
    
    if (suggestionInteractions.length > 0) {
      const acceptanceRate = suggestionInteractions.filter(i => 
        i.type === 'suggestion_accepted'
      ).length / suggestionInteractions.length;
      
      patterns.push({
        type: 'suggestion_acceptance',
        pattern: acceptanceRate > 0.7 ? 'accepts most suggestions' : 'selective with suggestions',
        frequency: suggestionInteractions.length,
        confidence: Math.min(0.9, suggestionInteractions.length / 10),
        examples: suggestionInteractions.slice(0, 3).map(i => i.type)
      });
    }

    return patterns;
  }

  private async generateContextVector(
    profile: UserProfile,
    preferences: UserPreferences,
    patterns: BehaviorPattern[]
  ): Promise<number[]> {
    // Create a context representation for vector similarity
    const contextText = [
      profile.industry || '',
      profile.experienceLevel || '',
      profile.targetRoles?.join(' ') || '',
      profile.skills?.join(' ') || '',
      preferences.writingStyle,
      preferences.contentLength,
      patterns.map(p => p.pattern).join(' ')
    ].join(' ');

    try {
      // Use AI to generate embedding
      const request: AIRequest = {
        id: crypto.randomUUID(),
        type: 'context',
        prompt: `Generate embedding for user context: ${contextText}`,
        context: { profile, preferences, patterns },
        userId: 'context-embedding',
        priority: 'normal',
        timestamp: new Date()
      };

      const response = await this.aiClients.generateEmbedding(contextText);
      return response || this.generateSimpleVector(contextText);
    } catch (error) {
      console.error('Failed to generate context vector:', error);
      return this.generateSimpleVector(contextText);
    }
  }

  private generateSimpleVector(text: string): number[] {
    // Simple hash-based vector generation as fallback
    const vector = new Array(128).fill(0);
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      vector[charCode % 128] += 1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  private async storeUserContext(
    userId: string,
    context: UserContext,
    contextVector: number[]
  ): Promise<void> {
    try {
      await prisma.userContext.upsert({
        where: { userId },
        update: {
          contextData: context as any,
          updatedAt: new Date()
        },
        create: {
          userId,
          contextData: context as any,
          updatedAt: new Date()
        }
      });

      // Store vector in vector database
      await this.vectorStore.storeVector(userId, contextVector, {
        userId,
        profile: context.profile,
        preferences: context.preferences
      });
    } catch (error) {
      console.error('Failed to store user context:', error);
    }
  }

  private async storeInteraction(userId: string, interaction: UserInteraction): Promise<void> {
    // In a real implementation, store in dedicated interactions table
    // For now, we'll update the context with the new interaction
    try {
      const existing = await this.getStoredContext(userId);
      if (existing && existing.history) {
        existing.history.interactions = [
          ...existing.history.interactions.slice(-49), // Keep last 49
          interaction
        ];
        
        await this.storeUserContext(userId, existing, []);
      }
    } catch (error) {
      console.error('Failed to store interaction:', error);
    }
  }

  private determineExperienceLevel(resumes: ResumeData[]): 'entry' | 'mid' | 'senior' | 'executive' {
    if (resumes.length === 0) return 'entry';
    
    // Simple heuristic based on number of jobs and content complexity
    const totalJobs = resumes.reduce((count, resume) => {
      const expSection = resume.sections.find(s => s.type === 'experience');
      return count + (expSection?.items.length || 0);
    }, 0);

    if (totalJobs >= 5) return 'senior';
    if (totalJobs >= 3) return 'mid';
    return 'entry';
  }

  private getMinimalContext(): UserContext {
    return {
      profile: {
        experienceLevel: 'entry',
        targetRoles: [],
        skills: [],
        careerGoals: []
      },
      preferences: {
        writingStyle: 'formal',
        contentLength: 'detailed',
        focusAreas: []
      },
      history: {
        interactions: [],
        feedbackPatterns: [],
        improvementAreas: []
      }
    };
  }

  private async processInteractionUpdate(
    currentContext: UserContextProfile,
    interaction: UserInteraction
  ): Promise<UserContextProfile> {
    const updatedContext = { ...currentContext };

    switch (interaction.type) {
      case 'suggestion_accepted':
        // Update behavior patterns
        const acceptancePattern = updatedContext.behaviorPatterns.find(
          p => p.type === 'suggestion_acceptance'
        );
        if (acceptancePattern) {
          acceptancePattern.frequency += 1;
          acceptancePattern.confidence = Math.min(0.95, acceptancePattern.confidence + 0.05);
        }
        break;

      case 'suggestion_rejected':
        // Learn from rejection patterns
        if (interaction.data?.suggestionType) {
          const rejectionPattern: BehaviorPattern = {
            type: 'suggestion_acceptance',
            pattern: `tends to reject ${interaction.data.suggestionType} suggestions`,
            frequency: 1,
            confidence: 0.6,
            examples: [interaction.data.suggestionType]
          };
          updatedContext.behaviorPatterns.push(rejectionPattern);
        }
        break;

      case 'content_generated':
        // Update content preferences
        if (interaction.data?.contentType) {
          updatedContext.preferences.focusAreas = [
            ...new Set([
              ...updatedContext.preferences.focusAreas,
              interaction.data.contentType
            ])
          ].slice(0, 10);
        }
        break;

      case 'analysis_requested':
        // Update technical preference
        updatedContext.preferences.writingStyle = 'technical';
        break;
    }

    return updatedContext;
  }

  private async generateAIRecommendations(
    contextProfile: UserContextProfile,
    userContext: UserContext,
    currentResume?: ResumeData
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const prompt = this.buildRecommendationPrompt(contextProfile, userContext, currentResume);
      
      const request: AIRequest = {
        id: crypto.randomUUID(),
        type: 'context',
        prompt,
        context: { contextProfile, userContext, currentResume },
        userId: contextProfile.userId,
        priority: 'normal',
        timestamp: new Date()
      };

      const response = await this.aiClients.generateCompletion(request);
      return this.parseAIRecommendations(response.content);
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
      return [];
    }
  }

  private async generatePatternBasedRecommendations(
    contextProfile: UserContextProfile
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Analyze behavior patterns for recommendations
    contextProfile.behaviorPatterns.forEach(pattern => {
      if (pattern.type === 'suggestion_acceptance' && pattern.confidence > 0.8) {
        if (pattern.pattern.includes('accepts most')) {
          recommendations.push({
            id: crypto.randomUUID(),
            type: 'workflow',
            title: 'Enable Auto-Accept for High-Confidence Suggestions',
            description: 'Based on your pattern of accepting suggestions, you might benefit from auto-accepting high-confidence recommendations.',
            confidence: pattern.confidence,
            reasoning: 'User consistently accepts AI suggestions',
            actionable: true,
            category: 'productivity',
            priority: 'medium'
          });
        }
      }
    });

    // Skill progression recommendations
    contextProfile.skillProgression.forEach(skill => {
      if (skill.trajectory === 'improving' && skill.recommendations.length > 0) {
        recommendations.push({
          id: crypto.randomUUID(),
          type: 'career',
          title: `Highlight ${skill.skill} Growth`,
          description: `Your ${skill.skill} skills are improving. Consider emphasizing recent achievements in this area.`,
          confidence: 0.8,
          reasoning: 'Skill shows positive trajectory',
          actionable: true,
          category: 'skills',
          priority: 'high'
        });
      }
    });

    return recommendations;
  }

  private async generateCareerRecommendations(
    contextProfile: UserContextProfile
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];
    const trajectory = contextProfile.careerTrajectory;

    if (trajectory.progression === 'upward' && trajectory.gaps.length > 0) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'career',
        title: 'Address Career Progression Gaps',
        description: `Focus on developing skills in: ${trajectory.gaps.slice(0, 3).join(', ')}`,
        confidence: 0.85,
        reasoning: 'Identified gaps in career progression path',
        actionable: true,
        category: 'career_development',
        priority: 'high'
      });
    }

    if (trajectory.currentLevel !== trajectory.targetLevel) {
      const levelGap = this.calculateLevelGap(trajectory.currentLevel, trajectory.targetLevel);
      recommendations.push({
        id: crypto.randomUUID(),
        type: 'template',
        title: `Optimize Resume for ${trajectory.targetLevel} Level`,
        description: `Adjust your resume template and content to better reflect ${trajectory.targetLevel}-level experience.`,
        confidence: 0.9,
        reasoning: `Target level (${trajectory.targetLevel}) differs from current level (${trajectory.currentLevel})`,
        actionable: true,
        category: 'positioning',
        priority: 'high'
      });
    }

    return recommendations;
  }

  private rankRecommendations(
    recommendations: PersonalizedRecommendation[],
    contextProfile: UserContextProfile
  ): PersonalizedRecommendation[] {
    return recommendations
      .sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by confidence
        return b.confidence - a.confidence;
      })
      .slice(0, 10); // Return top 10 recommendations
  }

  private getGenericRecommendations(): PersonalizedRecommendation[] {
    return [
      {
        id: crypto.randomUUID(),
        type: 'content',
        title: 'Add Quantified Achievements',
        description: 'Include specific numbers and metrics in your experience descriptions.',
        confidence: 0.8,
        reasoning: 'Quantified achievements improve resume impact',
        actionable: true,
        category: 'content_improvement',
        priority: 'high'
      },
      {
        id: crypto.randomUUID(),
        type: 'template',
        title: 'Optimize for ATS',
        description: 'Ensure your resume is ATS-friendly with proper formatting and keywords.',
        confidence: 0.75,
        reasoning: 'ATS optimization improves visibility',
        actionable: true,
        category: 'formatting',
        priority: 'medium'
      }
    ];
  }

  private async buildContextProfile(
    userId: string,
    storedContext: UserContext
  ): Promise<UserContextProfile> {
    const resumes = await this.getUserResumes(userId);
    const interactions = await this.getUserInteractions(userId);
    
    return {
      userId,
      profile: storedContext.profile || {},
      preferences: storedContext.preferences || { writingStyle: 'formal', contentLength: 'detailed', focusAreas: [] },
      behaviorPatterns: await this.analyzeBehaviorPatterns(interactions),
      skillProgression: await this.analyzeSkillProgression(resumes, interactions),
      careerTrajectory: await this.analyzeCareerTrajectory(storedContext.profile, resumes),
      contextVector: await this.generateContextVector(
        storedContext.profile || {},
        storedContext.preferences || { writingStyle: 'formal', contentLength: 'detailed', focusAreas: [] },
        []
      ),
      lastUpdated: new Date()
    };
  }

  private async analyzeSkillProgression(
    resumes: ResumeData[],
    interactions: UserInteraction[]
  ): Promise<SkillProgression[]> {
    const skillMap = new Map<string, SkillProgression>();

    // Extract skills from resumes
    resumes.forEach(resume => {
      resume.sections.forEach(section => {
        if (section.type === 'skills') {
          section.items.forEach(item => {
            if ('skills' in item && item.skills) {
              item.skills.forEach(skill => {
                if (!skillMap.has(skill)) {
                  skillMap.set(skill, {
                    skill,
                    level: 'intermediate',
                    trajectory: 'stable',
                    evidence: [],
                    recommendations: []
                  });
                }
                skillMap.get(skill)!.evidence.push(`Listed in ${section.title}`);
              });
            }
          });
        }
      });
    });

    return Array.from(skillMap.values());
  }

  /**
   * Get job-specific suggestions for resume optimization
   */
  async getJobSpecificSuggestions(
    userContext: UserContext,
    jobInfo: { targetJob?: string; targetCompany?: string }
  ): Promise<ContentSuggestion[]> {
    try {
      if (!jobInfo.targetJob && !jobInfo.targetCompany) {
        return [];
      }

      const prompt = `Based on the user's context and target position, provide specific suggestions for optimizing their resume:

User Context:
- Industry: ${userContext.profile.industry || 'Not specified'}
- Experience Level: ${userContext.profile.experienceLevel}
- Current Skills: ${userContext.profile.skills?.join(', ') || 'Not specified'}
- Target Roles: ${userContext.profile.targetRoles?.join(', ') || 'Not specified'}

Target Position:
- Job Title: ${jobInfo.targetJob || 'Not specified'}
- Company: ${jobInfo.targetCompany || 'Not specified'}

Provide 5-8 specific, actionable suggestions for optimizing the resume for this target position. Focus on:
1. Keywords to include
2. Skills to emphasize
3. Experience to highlight
4. Content modifications

Format as JSON array with objects containing: type, content, context, confidence, reasoning`;

      const request: AIRequest = {
        id: crypto.randomUUID(),
        type: 'content',
        prompt,
        context: { userContext, jobInfo },
        userId: 'job-optimization',
        priority: 'normal',
        timestamp: new Date()
      };

      const response = await this.aiClients.generateCompletion(request);
      return this.parseContentSuggestions(response.content);
    } catch (error) {
      console.error('Failed to get job-specific suggestions:', error);
      return this.getDefaultJobSuggestions(jobInfo);
    }
  }

  /**
   * Apply optimization suggestions to resume data
   */
  async applyOptimizations(
    resumeData: ResumeData,
    suggestions: ContentSuggestion[]
  ): Promise<ResumeData> {
    const optimizedData = { ...resumeData };

    for (const suggestion of suggestions) {
      switch (suggestion.type) {
        case 'keyword':
          optimizedData = this.addKeywords(optimizedData, suggestion.content);
          break;
        case 'skill':
          optimizedData = this.emphasizeSkill(optimizedData, suggestion.content);
          break;
        case 'achievement':
          optimizedData = this.enhanceAchievements(optimizedData, suggestion.content);
          break;
        case 'bullet_point':
          optimizedData = this.addBulletPoint(optimizedData, suggestion.content, suggestion.context);
          break;
      }
    }

    return optimizedData;
  }

  /**
   * Generate intelligent resume title
   */
  async generateResumeTitle(
    originalTitle: string,
    jobInfo: { targetJob?: string; targetCompany?: string }
  ): Promise<string> {
    try {
      if (!jobInfo.targetJob && !jobInfo.targetCompany) {
        return `${originalTitle} - Copy`;
      }

      const parts = [];
      if (jobInfo.targetJob) parts.push(jobInfo.targetJob);
      if (jobInfo.targetCompany) parts.push(jobInfo.targetCompany);
      
      return `${originalTitle} - ${parts.join(' at ')}`;
    } catch (error) {
      console.error('Failed to generate resume title:', error);
      return `${originalTitle} - Copy`;
    }
  }

  // Private helper methods for optimization

  private parseContentSuggestions(content: string): ContentSuggestion[] {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          id: crypto.randomUUID(),
          type: item.type || 'keyword',
          content: item.content || '',
          context: item.context || '',
          confidence: item.confidence || 0.8,
          reasoning: item.reasoning || ''
        }));
      }
    } catch (error) {
      console.error('Failed to parse content suggestions:', error);
    }
    return [];
  }

  private getDefaultJobSuggestions(jobInfo: { targetJob?: string; targetCompany?: string }): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    if (jobInfo.targetJob) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'keyword',
        content: jobInfo.targetJob,
        context: 'job title',
        confidence: 0.9,
        reasoning: 'Include target job title as keyword'
      });
    }

    if (jobInfo.targetCompany) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'keyword',
        content: jobInfo.targetCompany,
        context: 'company research',
        confidence: 0.8,
        reasoning: 'Research and mention company-relevant skills'
      });
    }

    return suggestions;
  }

  private addKeywords(resumeData: ResumeData, keyword: string): ResumeData {
    // Add keyword to skills section if it doesn't exist
    const skillsSection = resumeData.sections.find(s => s.type === 'skills');
    if (skillsSection && skillsSection.items.length > 0) {
      const firstSkillItem = skillsSection.items[0];
      if ('skills' in firstSkillItem && firstSkillItem.skills) {
        if (!firstSkillItem.skills.includes(keyword)) {
          firstSkillItem.skills.push(keyword);
        }
      }
    }
    return resumeData;
  }

  private emphasizeSkill(resumeData: ResumeData, skill: string): ResumeData {
    // Move skill to the beginning of skills list
    const skillsSection = resumeData.sections.find(s => s.type === 'skills');
    if (skillsSection && skillsSection.items.length > 0) {
      const firstSkillItem = skillsSection.items[0];
      if ('skills' in firstSkillItem && firstSkillItem.skills) {
        const skillIndex = firstSkillItem.skills.indexOf(skill);
        if (skillIndex > 0) {
          firstSkillItem.skills.splice(skillIndex, 1);
          firstSkillItem.skills.unshift(skill);
        }
      }
    }
    return resumeData;
  }

  private enhanceAchievements(resumeData: ResumeData, achievement: string): ResumeData {
    // Add achievement to the first experience item
    const experienceSection = resumeData.sections.find(s => s.type === 'experience');
    if (experienceSection && experienceSection.items.length > 0) {
      const firstExpItem = experienceSection.items[0];
      if ('achievements' in firstExpItem && Array.isArray(firstExpItem.achievements)) {
        firstExpItem.achievements.unshift(achievement);
      }
    }
    return resumeData;
  }

  private addBulletPoint(resumeData: ResumeData, bulletPoint: string, context: string): ResumeData {
    // Add bullet point to relevant section based on context
    if (context.includes('experience')) {
      const experienceSection = resumeData.sections.find(s => s.type === 'experience');
      if (experienceSection && experienceSection.items.length > 0) {
        const firstExpItem = experienceSection.items[0];
        if ('achievements' in firstExpItem && Array.isArray(firstExpItem.achievements)) {
          firstExpItem.achievements.push(bulletPoint);
        }
      }
    }
    return resumeData;
  }

  private async analyzeCareerTrajectory(
    profile: UserProfile | undefined,
    resumes: ResumeData[]
  ): Promise<CareerTrajectory> {
    const roles: string[] = [];
    
    resumes.forEach(resume => {
      resume.sections.forEach(section => {
        if (section.type === 'experience') {
          section.items.forEach(item => {
            if ('title' in item) {
              roles.push(item.title);
            }
          });
        }
      });
    });

    return {
      currentLevel: profile?.experienceLevel || 'mid',
      targetLevel: profile?.experienceLevel || 'senior',
      industry: profile?.industry || 'general',
      roles: [...new Set(roles)],
      progression: 'upward',
      timeframe: '2-3 years',
      gaps: []
    };
  }

  private async extractFeedbackPatterns(interactions: UserInteraction[]): Promise<any[]> {
    // Analyze feedback patterns from interactions
    const patterns: any[] = [];
    
    const acceptedSuggestions = interactions.filter(i => i.type === 'suggestion_accepted');
    const rejectedSuggestions = interactions.filter(i => i.type === 'suggestion_rejected');
    
    if (acceptedSuggestions.length > 0 || rejectedSuggestions.length > 0) {
      patterns.push({
        type: 'suggestion_feedback',
        acceptanceRate: acceptedSuggestions.length / (acceptedSuggestions.length + rejectedSuggestions.length),
        totalFeedback: acceptedSuggestions.length + rejectedSuggestions.length
      });
    }

    return patterns;
  }

  private async identifyImprovementAreas(
    resumes: ResumeData[],
    interactions: UserInteraction[]
  ): Promise<string[]> {
    const areas: string[] = [];
    
    // Analyze resume content for common improvement areas
    if (resumes.length > 0) {
      const latestResume = resumes[0];
      
      // Check for quantified achievements
      const hasQuantifiedAchievements = latestResume.sections.some(section => 
        section.type === 'experience' && section.items.some(item => 
          'description' in item && item.description?.some(desc => 
            /\d+/.test(desc)
          )
        )
      );
      
      if (!hasQuantifiedAchievements) {
        areas.push('Add quantified achievements');
      }
      
      // Check for skills section
      const hasSkillsSection = latestResume.sections.some(s => s.type === 'skills');
      if (!hasSkillsSection) {
        areas.push('Add skills section');
      }
    }

    return areas;
  }

  private buildRecommendationPrompt(
    contextProfile: UserContextProfile,
    userContext: UserContext,
    currentResume?: ResumeData
  ): string {
    return `
You are an expert career advisor providing personalized recommendations.

User Profile:
- Industry: ${contextProfile.profile.industry || 'Not specified'}
- Experience Level: ${contextProfile.profile.experienceLevel || 'Not specified'}
- Target Roles: ${contextProfile.profile.targetRoles?.join(', ') || 'Not specified'}
- Career Trajectory: ${contextProfile.careerTrajectory.progression}

Behavior Patterns:
${contextProfile.behaviorPatterns.map(p => `- ${p.pattern} (confidence: ${p.confidence})`).join('\n')}

Current Resume Summary:
${currentResume ? this.summarizeResume(currentResume) : 'No current resume provided'}

Generate 3-5 personalized recommendations that are:
1. Specific to the user's profile and patterns
2. Actionable and practical
3. Prioritized by impact and relevance

Format as JSON array with structure:
{
  "type": "content|template|workflow|career",
  "title": "Recommendation title",
  "description": "Detailed description",
  "confidence": 0.0-1.0,
  "reasoning": "Why this recommendation fits the user",
  "actionable": true,
  "category": "category_name",
  "priority": "low|medium|high"
}
`;
  }

  private parseAIRecommendations(content: string): PersonalizedRecommendation[] {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed.map(item => ({
        id: crypto.randomUUID(),
        type: item.type || 'content',
        title: item.title || 'Recommendation',
        description: item.description || '',
        confidence: item.confidence || 0.7,
        reasoning: item.reasoning || '',
        actionable: item.actionable !== false,
        category: item.category || 'general',
        priority: item.priority || 'medium'
      })) : [];
    } catch (error) {
      console.error('Failed to parse AI recommendations:', error);
      return [];
    }
  }

  private summarizeResume(resume: ResumeData): string {
    const sections = resume.sections.map(s => s.type).join(', ');
    const experienceCount = resume.sections.find(s => s.type === 'experience')?.items.length || 0;
    return `Resume with sections: ${sections}. ${experienceCount} experience entries.`;
  }

  private calculateLevelGap(current: string, target: string): number {
    const levels = { entry: 1, mid: 2, senior: 3, executive: 4 };
    return levels[target as keyof typeof levels] - levels[current as keyof typeof levels];
  }
}

// Singleton instance
let contextAgentInstance: ContextAgent | null = null;

export function getContextAgent(): ContextAgent {
  if (!contextAgentInstance) {
    contextAgentInstance = new ContextAgent();
  }
  return contextAgentInstance;
}