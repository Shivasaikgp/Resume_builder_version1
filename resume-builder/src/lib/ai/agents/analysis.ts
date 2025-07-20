// Resume Analysis AI Agent
// Provides comprehensive resume quality assessment, ATS compatibility checking, and actionable improvement suggestions

import { getAIClients } from '../clients';
import { AIRequest } from '../types';
import { 
  ResumeData, 
  UserContext, 
  ResumeAnalysis,
  ATSResult,
  ResumeScore,
  ExperienceItem,
  PersonalInfo 
} from '../../../types';

export interface AnalysisOptions {
  includeATSCheck?: boolean;
  includeContentAnalysis?: boolean;
  includeKeywordAnalysis?: boolean;
  targetJobDescription?: string;
  priorityThreshold?: 'low' | 'medium' | 'high';
}

export interface ImprovementSuggestion {
  id: string;
  type: 'content' | 'formatting' | 'keywords' | 'structure' | 'ats';
  priority: 'low' | 'medium' | 'high';
  message: string;
  section?: string;
  specificIssue: string;
  recommendation: string;
  impact: 'minor' | 'moderate' | 'major';
  effort: 'low' | 'medium' | 'high';
}

export interface KeywordAnalysis {
  totalKeywords: number;
  industryKeywords: string[];
  skillKeywords: string[];
  actionVerbs: string[];
  missingKeywords: string[];
  keywordDensity: Record<string, number>;
  recommendations: string[];
}

export interface ContentQualityMetrics {
  bulletPointCount: number;
  averageBulletLength: number;
  quantifiedAchievements: number;
  actionVerbUsage: number;
  passiveLanguage: number;
  repetitiveContent: number;
  grammarIssues: string[];
  clarityScore: number;
}

export class AnalysisAgent {
  private aiClients = getAIClients();
  
  // ATS-friendly keywords by industry
  private readonly industryKeywords: Record<string, string[]> = {
    technology: [
      'software development', 'programming', 'coding', 'debugging', 'testing',
      'agile', 'scrum', 'devops', 'cloud computing', 'database', 'api',
      'frontend', 'backend', 'full-stack', 'mobile development', 'web development'
    ],
    marketing: [
      'digital marketing', 'seo', 'sem', 'social media', 'content marketing',
      'brand management', 'campaign management', 'analytics', 'conversion optimization',
      'email marketing', 'lead generation', 'market research', 'roi', 'kpi'
    ],
    finance: [
      'financial analysis', 'budgeting', 'forecasting', 'risk management',
      'investment', 'portfolio management', 'financial modeling', 'compliance',
      'audit', 'accounting', 'tax', 'regulatory', 'financial reporting'
    ],
    sales: [
      'sales management', 'lead generation', 'client relationship', 'negotiation',
      'closing deals', 'pipeline management', 'crm', 'quota attainment',
      'territory management', 'account management', 'prospecting', 'revenue growth'
    ],
    general: [
      'project management', 'team leadership', 'communication', 'problem solving',
      'analytical thinking', 'strategic planning', 'process improvement',
      'collaboration', 'time management', 'customer service', 'training', 'mentoring'
    ]
  };

  // Common ATS-unfriendly elements
  private readonly atsRedFlags = [
    'tables', 'text boxes', 'headers/footers', 'graphics', 'special characters',
    'unusual fonts', 'multiple columns', 'embedded objects'
  ];

  // Strong action verbs for different categories
  private readonly strongActionVerbs = [
    'achieved', 'accelerated', 'accomplished', 'advanced', 'analyzed', 'architected',
    'built', 'collaborated', 'created', 'delivered', 'developed', 'directed',
    'enhanced', 'established', 'executed', 'generated', 'implemented', 'improved',
    'increased', 'initiated', 'launched', 'led', 'managed', 'optimized',
    'orchestrated', 'pioneered', 'reduced', 'resolved', 'spearheaded', 'streamlined'
  ];

  /**
   * Perform comprehensive resume analysis
   */
  async analyzeResume(
    resume: ResumeData,
    context?: UserContext,
    options: AnalysisOptions = {}
  ): Promise<ResumeAnalysis> {
    const {
      includeATSCheck = true,
      includeContentAnalysis = true,
      includeKeywordAnalysis = true,
      targetJobDescription,
      priorityThreshold = 'medium'
    } = options;

    try {
      // Perform parallel analysis
      const [
        contentQuality,
        atsResult,
        keywordAnalysis,
        aiAnalysis
      ] = await Promise.all([
        includeContentAnalysis ? this.analyzeContentQuality(resume) : null,
        includeATSCheck ? this.checkATSCompatibility(resume) : null,
        includeKeywordAnalysis ? this.analyzeKeywords(resume, context, targetJobDescription) : null,
        this.performAIAnalysis(resume, context, targetJobDescription)
      ]);

      // Calculate overall score
      const score = this.calculateOverallScore(contentQuality, atsResult, keywordAnalysis, aiAnalysis);

      // Generate improvement suggestions
      const suggestions = this.generateImprovementSuggestions(
        resume,
        contentQuality,
        atsResult,
        keywordAnalysis,
        aiAnalysis,
        priorityThreshold
      );

      // Identify strengths and areas for improvement
      const strengths = this.identifyStrengths(resume, contentQuality, atsResult, keywordAnalysis);
      const improvements = suggestions
        .filter(s => s.priority === 'high' || s.priority === 'medium')
        .map(s => s.recommendation)
        .slice(0, 5);

      return {
        overallScore: score.overall,
        breakdown: score.breakdown,
        suggestions: suggestions.map(s => ({
          type: s.type,
          priority: s.priority,
          message: s.message,
          section: s.section
        })),
        strengths,
        improvements
      };

    } catch (error) {
      console.error('Resume analysis failed:', error);
      // Return fallback analysis
      return this.generateFallbackAnalysis(resume);
    }
  }

  /**
   * Generate real-time resume score
   */
  async scoreResume(resume: ResumeData, context?: UserContext): Promise<ResumeScore> {
    const contentQuality = await this.analyzeContentQuality(resume);
    const atsResult = await this.checkATSCompatibility(resume);
    const keywordAnalysis = await this.analyzeKeywords(resume, context);

    const score = this.calculateOverallScore(contentQuality, atsResult, keywordAnalysis);
    
    const strengths = this.identifyStrengths(resume, contentQuality, atsResult, keywordAnalysis);
    const suggestions = this.generateImprovementSuggestions(
      resume, contentQuality, atsResult, keywordAnalysis, null, 'medium'
    );

    return {
      overall: score.overall,
      breakdown: score.breakdown,
      details: {
        strengths,
        improvements: suggestions
          .filter(s => s.priority === 'high')
          .map(s => s.recommendation)
          .slice(0, 3),
        criticalIssues: suggestions
          .filter(s => s.priority === 'high' && s.impact === 'major')
          .map(s => s.specificIssue)
      }
    };
  }

  /**
   * Check ATS compatibility
   */
  async checkATSCompatibility(resume: ResumeData): Promise<ATSResult> {
    const keywords = this.extractKeywords(resume);
    const formattingIssues = this.checkFormattingIssues(resume);
    
    // Calculate ATS score based on various factors
    let score = 100;
    
    // Deduct points for formatting issues
    score -= formattingIssues.length * 10;
    
    // Deduct points for missing essential sections
    const essentialSections = ['experience', 'education', 'skills'];
    const missingSections = essentialSections.filter(
      section => !resume.sections.some(s => s.type === section)
    );
    score -= missingSections.length * 15;

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      keywords: {
        found: keywords.found,
        missing: keywords.missing,
        density: keywords.density
      },
      formatting: {
        issues: formattingIssues,
        recommendations: this.generateFormattingRecommendations(formattingIssues)
      }
    };
  }

  /**
   * Analyze content quality
   */
  private async analyzeContentQuality(resume: ResumeData): Promise<ContentQualityMetrics> {
    const experienceSection = resume.sections.find(s => s.type === 'experience');
    const allBulletPoints: string[] = [];
    
    if (experienceSection) {
      experienceSection.items.forEach(item => {
        const expItem = item as ExperienceItem;
        if (expItem.description) {
          allBulletPoints.push(...expItem.description);
        }
      });
    }

    const bulletPointCount = allBulletPoints.length;
    const averageBulletLength = bulletPointCount > 0 
      ? allBulletPoints.reduce((sum, bullet) => sum + bullet.length, 0) / bulletPointCount 
      : 0;

    const quantifiedAchievements = this.countQuantifiedAchievements(allBulletPoints);
    const actionVerbUsage = this.analyzeActionVerbUsage(allBulletPoints);
    const passiveLanguage = this.detectPassiveLanguage(allBulletPoints);
    const repetitiveContent = this.detectRepetitiveContent(allBulletPoints);
    const grammarIssues = await this.detectGrammarIssues(allBulletPoints);
    const clarityScore = this.calculateClarityScore(allBulletPoints);

    return {
      bulletPointCount,
      averageBulletLength,
      quantifiedAchievements,
      actionVerbUsage,
      passiveLanguage,
      repetitiveContent,
      grammarIssues,
      clarityScore
    };
  }

  /**
   * Analyze keywords and their relevance
   */
  async analyzeKeywords(
    resume: ResumeData, 
    context?: UserContext, 
    jobDescription?: string
  ): Promise<KeywordAnalysis> {
    const resumeText = this.extractResumeText(resume);
    const industry = context?.profile?.industry?.toLowerCase() || 'general';
    
    const relevantKeywords = this.industryKeywords[industry] || this.industryKeywords.general;
    const foundKeywords = relevantKeywords.filter(keyword => 
      resumeText.toLowerCase().includes(keyword.toLowerCase())
    );
    const missingKeywords = relevantKeywords.filter(keyword => 
      !resumeText.toLowerCase().includes(keyword.toLowerCase())
    );

    // Calculate keyword density
    const keywordDensity: Record<string, number> = {};
    foundKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = resumeText.match(regex);
      keywordDensity[keyword] = matches ? matches.length : 0;
    });

    // Extract skills and action verbs
    const skillKeywords = this.extractSkillKeywords(resume);
    const actionVerbs = this.extractActionVerbs(resume);

    // Generate keyword recommendations
    const recommendations = this.generateKeywordRecommendations(
      foundKeywords, 
      missingKeywords, 
      jobDescription
    );

    return {
      totalKeywords: foundKeywords.length,
      industryKeywords: foundKeywords,
      skillKeywords,
      actionVerbs,
      missingKeywords: missingKeywords.slice(0, 10), // Top 10 missing keywords
      keywordDensity,
      recommendations
    };
  }

  /**
   * Perform AI-powered analysis
   */
  private async performAIAnalysis(
    resume: ResumeData,
    context?: UserContext,
    jobDescription?: string
  ): Promise<any> {
    const prompt = this.buildAnalysisPrompt(resume, context, jobDescription);
    
    const request: AIRequest = {
      id: crypto.randomUUID(),
      type: 'analysis',
      prompt,
      context: { resume, userContext: context, jobDescription },
      userId: context?.profile?.industry || 'anonymous',
      priority: 'normal',
      timestamp: new Date()
    };

    try {
      const response = await this.aiClients.generateCompletion(request);
      return this.parseAIAnalysis(response.content);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return null;
    }
  }

  // Private helper methods

  private calculateOverallScore(
    contentQuality: ContentQualityMetrics | null,
    atsResult: ATSResult | null,
    keywordAnalysis: KeywordAnalysis | null,
    aiAnalysis?: any
  ): ResumeScore {
    let contentScore = 70; // Base score
    let formattingScore = 85; // Base score
    let atsScore = atsResult?.score || 75;
    let keywordScore = 70; // Base score

    if (contentQuality) {
      // Adjust content score based on quality metrics
      contentScore = this.calculateContentScore(contentQuality);
    }

    if (keywordAnalysis) {
      // Adjust keyword score based on keyword analysis
      keywordScore = Math.min(100, (keywordAnalysis.totalKeywords / 15) * 100);
    }

    const overall = Math.round(
      (contentScore * 0.35) + 
      (formattingScore * 0.25) + 
      (atsScore * 0.25) + 
      (keywordScore * 0.15)
    );

    return {
      overall,
      breakdown: {
        content: contentScore,
        formatting: formattingScore,
        atsCompatibility: atsScore,
        keywords: keywordScore
      }
    };
  }

  private calculateContentScore(metrics: ContentQualityMetrics): number {
    let score = 70; // Base score

    // Bullet point quantity (ideal: 3-5 per job)
    if (metrics.bulletPointCount >= 6) score += 10;
    else if (metrics.bulletPointCount >= 3) score += 5;
    else score -= 10;

    // Quantified achievements
    const achievementRatio = metrics.quantifiedAchievements / Math.max(1, metrics.bulletPointCount);
    if (achievementRatio >= 0.5) score += 15;
    else if (achievementRatio >= 0.3) score += 10;
    else if (achievementRatio >= 0.1) score += 5;

    // Action verb usage
    if (metrics.actionVerbUsage >= 0.8) score += 10;
    else if (metrics.actionVerbUsage >= 0.6) score += 5;
    else score -= 5;

    // Passive language penalty
    if (metrics.passiveLanguage > 0.3) score -= 10;
    else if (metrics.passiveLanguage > 0.1) score -= 5;

    // Clarity score
    score += (metrics.clarityScore - 70) * 0.3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private generateImprovementSuggestions(
    resume: ResumeData,
    contentQuality: ContentQualityMetrics | null,
    atsResult: ATSResult | null,
    keywordAnalysis: KeywordAnalysis | null,
    aiAnalysis: any,
    priorityThreshold: string
  ): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // Content-based suggestions
    if (contentQuality) {
      if (contentQuality.quantifiedAchievements < 2) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'content',
          priority: 'high',
          message: 'Add more quantified achievements to demonstrate impact',
          section: 'experience',
          specificIssue: 'Lack of quantified achievements',
          recommendation: 'Include specific numbers, percentages, or metrics in your bullet points',
          impact: 'major',
          effort: 'medium'
        });
      }

      if (contentQuality.actionVerbUsage < 0.6) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'content',
          priority: 'medium',
          message: 'Use stronger action verbs to begin bullet points',
          section: 'experience',
          specificIssue: 'Weak action verbs',
          recommendation: 'Start bullet points with impactful action verbs like "Led", "Achieved", "Implemented"',
          impact: 'moderate',
          effort: 'low'
        });
      }

      if (contentQuality.bulletPointCount < 3) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'content',
          priority: 'high',
          message: 'Add more bullet points to better showcase your experience',
          section: 'experience',
          specificIssue: 'Insufficient detail in experience descriptions',
          recommendation: 'Include 3-5 bullet points per job to adequately describe your responsibilities and achievements',
          impact: 'major',
          effort: 'high'
        });
      }
    }

    // ATS-based suggestions
    if (atsResult && atsResult.score < 80) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'ats',
        priority: 'high',
        message: 'Improve ATS compatibility to increase visibility to recruiters',
        specificIssue: 'Low ATS compatibility score',
        recommendation: 'Use standard section headings, avoid complex formatting, and include relevant keywords',
        impact: 'major',
        effort: 'medium'
      });
    }

    // Keyword-based suggestions
    if (keywordAnalysis && keywordAnalysis.missingKeywords.length > 5) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'keywords',
        priority: 'medium',
        message: 'Include more industry-relevant keywords',
        section: 'skills',
        specificIssue: 'Missing important industry keywords',
        recommendation: `Consider adding keywords like: ${keywordAnalysis.missingKeywords.slice(0, 3).join(', ')}`,
        impact: 'moderate',
        effort: 'low'
      });
    }

    // Filter by priority threshold
    const priorityOrder = { low: 0, medium: 1, high: 2 };
    const threshold = priorityOrder[priorityThreshold as keyof typeof priorityOrder];
    
    return suggestions
      .filter(s => priorityOrder[s.priority] >= threshold)
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  private identifyStrengths(
    resume: ResumeData,
    contentQuality: ContentQualityMetrics | null,
    atsResult: ATSResult | null,
    keywordAnalysis: KeywordAnalysis | null
  ): string[] {
    const strengths: string[] = [];

    if (contentQuality) {
      if (contentQuality.quantifiedAchievements >= 3) {
        strengths.push('Strong use of quantified achievements');
      }
      if (contentQuality.actionVerbUsage >= 0.8) {
        strengths.push('Excellent use of action verbs');
      }
      if (contentQuality.clarityScore >= 80) {
        strengths.push('Clear and concise writing style');
      }
    }

    if (atsResult && atsResult.score >= 85) {
      strengths.push('Excellent ATS compatibility');
    }

    if (keywordAnalysis && keywordAnalysis.totalKeywords >= 10) {
      strengths.push('Good keyword optimization');
    }

    // Check for complete sections
    const hasAllEssentialSections = ['experience', 'education', 'skills'].every(
      section => resume.sections.some(s => s.type === section)
    );
    if (hasAllEssentialSections) {
      strengths.push('Complete resume structure with all essential sections');
    }

    return strengths;
  }

  // Additional helper methods for analysis

  private extractKeywords(resume: ResumeData): { found: string[], missing: string[], density: Record<string, number> } {
    const resumeText = this.extractResumeText(resume);
    const allKeywords = Object.values(this.industryKeywords).flat();
    
    const found = allKeywords.filter(keyword => 
      resumeText.toLowerCase().includes(keyword.toLowerCase())
    );
    const missing = allKeywords.filter(keyword => 
      !resumeText.toLowerCase().includes(keyword.toLowerCase())
    );

    const density: Record<string, number> = {};
    found.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = resumeText.match(regex);
      density[keyword] = matches ? matches.length : 0;
    });

    return { found, missing, density };
  }

  private extractResumeText(resume: ResumeData): string {
    let text = `${resume.personalInfo.fullName} ${resume.personalInfo.email}`;
    
    resume.sections.forEach(section => {
      text += ` ${section.title}`;
      section.items.forEach(item => {
        if ('title' in item) text += ` ${item.title}`;
        if ('company' in item) text += ` ${item.company}`;
        if ('description' in item && item.description) {
          text += ` ${item.description.join(' ')}`;
        }
        if ('skills' in item && item.skills) {
          text += ` ${item.skills.join(' ')}`;
        }
      });
    });

    return text;
  }

  private checkFormattingIssues(resume: ResumeData): string[] {
    const issues: string[] = [];

    // Check for missing contact information
    if (!resume.personalInfo.email) {
      issues.push('Missing email address');
    }
    if (!resume.personalInfo.phone) {
      issues.push('Missing phone number');
    }

    // Check for empty sections
    resume.sections.forEach(section => {
      if (section.items.length === 0) {
        issues.push(`Empty ${section.title} section`);
      }
    });

    return issues;
  }

  private generateFormattingRecommendations(issues: string[]): string[] {
    return issues.map(issue => {
      switch (issue) {
        case 'Missing email address':
          return 'Add a professional email address to your contact information';
        case 'Missing phone number':
          return 'Include a phone number for recruiters to contact you';
        default:
          if (issue.includes('Empty')) {
            return `Add content to the ${issue.split(' ')[1]} section or remove it`;
          }
          return 'Review and fix formatting issues';
      }
    });
  }

  private countQuantifiedAchievements(bulletPoints: string[]): number {
    const numberRegex = /\d+[%$]?|\$\d+|[0-9,]+/g;
    return bulletPoints.filter(bullet => numberRegex.test(bullet)).length;
  }

  private analyzeActionVerbUsage(bulletPoints: string[]): number {
    if (bulletPoints.length === 0) return 0;
    
    const strongVerbCount = bulletPoints.filter(bullet => {
      const firstWord = bullet.trim().split(' ')[0].toLowerCase();
      return this.strongActionVerbs.some(verb => 
        firstWord.includes(verb.toLowerCase())
      );
    }).length;

    return strongVerbCount / bulletPoints.length;
  }

  private detectPassiveLanguage(bulletPoints: string[]): number {
    if (bulletPoints.length === 0) return 0;
    
    const passiveIndicators = ['was', 'were', 'been', 'being', 'responsible for'];
    const passiveCount = bulletPoints.filter(bullet => 
      passiveIndicators.some(indicator => 
        bullet.toLowerCase().includes(indicator)
      )
    ).length;

    return passiveCount / bulletPoints.length;
  }

  private detectRepetitiveContent(bulletPoints: string[]): number {
    if (bulletPoints.length === 0) return 0;
    
    const words = bulletPoints.join(' ').toLowerCase().split(/\s+/);
    const wordCount: Record<string, number> = {};
    
    words.forEach(word => {
      if (word.length > 3) { // Only count meaningful words
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    const repetitiveWords = Object.values(wordCount).filter(count => count > 3).length;
    return repetitiveWords / Object.keys(wordCount).length;
  }

  private async detectGrammarIssues(bulletPoints: string[]): Promise<string[]> {
    // Basic grammar checks - in a real implementation, you might use a grammar checking API
    const issues: string[] = [];
    
    bulletPoints.forEach((bullet, index) => {
      // Check for common issues
      if (bullet.length > 200) {
        issues.push(`Bullet point ${index + 1} is too long`);
      }
      if (!bullet.trim().endsWith('.') && !bullet.trim().endsWith(';')) {
        issues.push(`Bullet point ${index + 1} missing punctuation`);
      }
      if (bullet.includes('  ')) {
        issues.push(`Bullet point ${index + 1} has double spaces`);
      }
    });

    return issues;
  }

  private calculateClarityScore(bulletPoints: string[]): number {
    if (bulletPoints.length === 0) return 0;
    
    let score = 70; // Base score
    
    const avgLength = bulletPoints.reduce((sum, bullet) => sum + bullet.length, 0) / bulletPoints.length;
    
    // Ideal bullet point length: 80-150 characters
    if (avgLength >= 80 && avgLength <= 150) score += 20;
    else if (avgLength >= 60 && avgLength <= 180) score += 10;
    else score -= 10;

    // Check for clear structure
    const structuredBullets = bulletPoints.filter(bullet => 
      bullet.includes(':') || bullet.match(/\d+/) || bullet.includes('%')
    ).length;
    
    score += (structuredBullets / bulletPoints.length) * 10;

    return Math.max(0, Math.min(100, score));
  }

  private extractSkillKeywords(resume: ResumeData): string[] {
    const skillsSection = resume.sections.find(s => s.type === 'skills');
    const skills: string[] = [];
    
    if (skillsSection) {
      skillsSection.items.forEach(item => {
        if ('skills' in item && item.skills) {
          skills.push(...item.skills);
        }
      });
    }

    return skills;
  }

  private extractActionVerbs(resume: ResumeData): string[] {
    const experienceSection = resume.sections.find(s => s.type === 'experience');
    const verbs: string[] = [];
    
    if (experienceSection) {
      experienceSection.items.forEach(item => {
        const expItem = item as ExperienceItem;
        if (expItem.description) {
          expItem.description.forEach(bullet => {
            const firstWord = bullet.trim().split(' ')[0];
            if (this.strongActionVerbs.includes(firstWord.toLowerCase())) {
              verbs.push(firstWord);
            }
          });
        }
      });
    }

    return [...new Set(verbs)]; // Remove duplicates
  }

  private generateKeywordRecommendations(
    foundKeywords: string[],
    missingKeywords: string[],
    jobDescription?: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (foundKeywords.length < 5) {
      recommendations.push('Include more industry-relevant keywords throughout your resume');
    }
    
    if (missingKeywords.length > 10) {
      recommendations.push(`Consider adding these keywords: ${missingKeywords.slice(0, 5).join(', ')}`);
    }
    
    if (jobDescription) {
      recommendations.push('Tailor your keywords to match the specific job description');
    }

    return recommendations;
  }

  private buildAnalysisPrompt(
    resume: ResumeData,
    context?: UserContext,
    jobDescription?: string
  ): string {
    const resumeText = this.extractResumeText(resume);
    
    return `
You are an expert resume analyst. Analyze this resume and provide detailed feedback.

Resume Content:
${resumeText}

${context ? `
User Context:
- Industry: ${context.profile?.industry || 'Not specified'}
- Experience Level: ${context.profile?.experienceLevel || 'Not specified'}
- Target Roles: ${context.profile?.targetRoles?.join(', ') || 'Not specified'}
` : ''}

${jobDescription ? `
Target Job Description:
${jobDescription}
` : ''}

Provide analysis in the following areas:
1. Content quality and impact
2. ATS compatibility
3. Keyword optimization
4. Structure and formatting
5. Overall effectiveness

Format your response as JSON with this structure:
{
  "contentAnalysis": {
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "suggestions": ["suggestion1", "suggestion2"]
  },
  "atsAnalysis": {
    "score": 0-100,
    "issues": ["issue1", "issue2"],
    "recommendations": ["rec1", "rec2"]
  },
  "keywordAnalysis": {
    "relevantKeywords": ["keyword1", "keyword2"],
    "missingKeywords": ["missing1", "missing2"]
  },
  "overallRecommendations": ["rec1", "rec2", "rec3"]
}
`;
  }

  private parseAIAnalysis(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse AI analysis:', error);
      return null;
    }
  }

  private generateFallbackAnalysis(resume: ResumeData): ResumeAnalysis {
    return {
      overallScore: 70,
      breakdown: {
        content: 70,
        formatting: 75,
        atsCompatibility: 70,
        keywords: 65
      },
      suggestions: [
        {
          type: 'content',
          priority: 'medium',
          message: 'Consider adding more quantified achievements to demonstrate impact'
        }
      ],
      strengths: ['Complete resume structure'],
      improvements: ['Add more specific achievements', 'Include relevant keywords']
    };
  }
}

// Singleton instance
let analysisAgentInstance: AnalysisAgent | null = null;

export function getAnalysisAgent(): AnalysisAgent {
  if (!analysisAgentInstance) {
    analysisAgentInstance = new AnalysisAgent();
  }
  return analysisAgentInstance;
}