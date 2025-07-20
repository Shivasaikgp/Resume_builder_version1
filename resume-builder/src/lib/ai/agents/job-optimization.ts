// Job Description Analysis and Resume Optimization AI Agent
// Provides job-specific resume optimization, keyword matching, and targeted content suggestions

import { getAIClients } from '../clients';
import { AIRequest } from '../types';
import { 
  ResumeData, 
  UserContext, 
  ExperienceItem,
  SkillsItem 
} from '../../../types';

export interface JobDescription {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  responsibilities: string[];
  location?: string;
  salaryRange?: string;
  benefits?: string[];
}

export interface JobAnalysis {
  keywords: JobKeywords;
  requirements: RequirementAnalysis;
  skills: SkillAnalysis;
  experience: ExperienceAnalysis;
  culture: CultureAnalysis;
}

export interface JobKeywords {
  technical: string[];
  soft: string[];
  industry: string[];
  tools: string[];
  certifications: string[];
  actionVerbs: string[];
  buzzwords: string[];
}

export interface RequirementAnalysis {
  mustHave: string[];
  niceToHave: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  yearsRequired: number | null;
  educationLevel: string | null;
}

export interface SkillAnalysis {
  technical: SkillMatch[];
  soft: SkillMatch[];
  tools: SkillMatch[];
  missing: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface SkillMatch {
  skill: string;
  importance: 'critical' | 'important' | 'preferred';
  found: boolean;
  alternatives?: string[];
}

export interface ExperienceAnalysis {
  relevantExperience: ExperienceMatch[];
  missingExperience: string[];
  transferableSkills: string[];
  recommendedHighlights: string[];
}

export interface ExperienceMatch {
  jobTitle: string;
  company: string;
  relevanceScore: number;
  matchingResponsibilities: string[];
  suggestedEnhancements: string[];
}

export interface CultureAnalysis {
  values: string[];
  workStyle: string[];
  environment: string;
  teamStructure: string;
}

export interface OptimizationSuggestions {
  keywordOptimization: KeywordSuggestion[];
  contentEnhancements: ContentEnhancement[];
  structuralChanges: StructuralSuggestion[];
  priorityActions: PriorityAction[];
  matchScore: number;
}

export interface KeywordSuggestion {
  keyword: string;
  importance: 'critical' | 'important' | 'preferred';
  suggestedPlacement: string[];
  currentUsage: number;
  recommendedUsage: number;
}

export interface ContentEnhancement {
  section: string;
  type: 'add' | 'modify' | 'emphasize';
  suggestion: string;
  reasoning: string;
  impact: 'high' | 'medium' | 'low';
}

export interface StructuralSuggestion {
  type: 'reorder' | 'add_section' | 'remove_section' | 'merge_sections';
  description: string;
  reasoning: string;
  effort: 'low' | 'medium' | 'high';
}

export interface PriorityAction {
  action: string;
  reasoning: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  order: number;
}

export class JobOptimizationAgent {
  private aiClients = getAIClients();
  
  // Industry-specific keyword patterns
  private readonly industryPatterns: Record<string, RegExp[]> = {
    technology: [
      /\b(software|programming|development|coding|engineering)\b/gi,
      /\b(javascript|python|java|react|node\.js|typescript)\b/gi,
      /\b(api|database|cloud|aws|docker|kubernetes)\b/gi,
      /\b(agile|scrum|devops|ci\/cd|git)\b/gi
    ],
    marketing: [
      /\b(marketing|advertising|campaign|brand|digital)\b/gi,
      /\b(seo|sem|social media|content|analytics)\b/gi,
      /\b(google analytics|facebook ads|email marketing)\b/gi,
      /\b(roi|kpi|conversion|lead generation)\b/gi
    ],
    finance: [
      /\b(financial|accounting|budget|forecast|analysis)\b/gi,
      /\b(excel|sql|tableau|powerbi|quickbooks)\b/gi,
      /\b(gaap|sox|audit|compliance|risk)\b/gi,
      /\b(investment|portfolio|trading|derivatives)\b/gi
    ],
    sales: [
      /\b(sales|selling|revenue|quota|pipeline)\b/gi,
      /\b(crm|salesforce|hubspot|lead|prospect)\b/gi,
      /\b(negotiation|closing|relationship|account)\b/gi,
      /\b(b2b|b2c|enterprise|territory)\b/gi
    ]
  };

  // Common requirement patterns
  private readonly requirementPatterns = {
    experience: /(\d+)[\+\-\s]*years?\s+(?:of\s+)?(?:experience|exp)/gi,
    education: /\b(bachelor|master|phd|degree|diploma|certification)\b/gi,
    mustHave: /\b(required|must\s+have|essential|mandatory|necessary)\b/gi,
    preferred: /\b(preferred|nice\s+to\s+have|plus|bonus|desired)\b/gi
  };

  /**
   * Parse and analyze job description
   */
  async analyzeJobDescription(jobDescription: string): Promise<JobAnalysis> {
    try {
      // Use AI to extract structured information
      const aiAnalysis = await this.performAIJobAnalysis(jobDescription);
      
      // Combine AI analysis with rule-based extraction
      const keywords = this.extractKeywords(jobDescription);
      const requirements = this.analyzeRequirements(jobDescription);
      const skills = this.analyzeSkillRequirements(jobDescription);
      const experience = this.analyzeExperienceRequirements(jobDescription);
      const culture = this.analyzeCulture(jobDescription);

      return {
        keywords: { ...keywords, ...aiAnalysis.keywords },
        requirements: { ...requirements, ...aiAnalysis.requirements },
        skills: { ...skills, ...aiAnalysis.skills },
        experience: { ...experience, ...aiAnalysis.experience },
        culture: { ...culture, ...aiAnalysis.culture }
      };

    } catch (error) {
      console.error('Job description analysis failed:', error);
      // Return fallback analysis
      return this.generateFallbackJobAnalysis(jobDescription);
    }
  }

  /**
   * Optimize resume for specific job
   */
  async optimizeResumeForJob(
    resume: ResumeData,
    jobDescription: string,
    context?: UserContext
  ): Promise<OptimizationSuggestions> {
    try {
      // Analyze the job description
      const jobAnalysis = await this.analyzeJobDescription(jobDescription);
      
      // Analyze current resume against job requirements
      const matchAnalysis = this.analyzeResumeJobMatch(resume, jobAnalysis);
      
      // Generate optimization suggestions
      const keywordOptimization = this.generateKeywordSuggestions(resume, jobAnalysis);
      const contentEnhancements = this.generateContentEnhancements(resume, jobAnalysis, matchAnalysis);
      const structuralChanges = this.generateStructuralSuggestions(resume, jobAnalysis);
      const priorityActions = this.generatePriorityActions(
        keywordOptimization,
        contentEnhancements,
        structuralChanges
      );

      // Calculate overall match score
      const matchScore = this.calculateMatchScore(resume, jobAnalysis);

      return {
        keywordOptimization,
        contentEnhancements,
        structuralChanges,
        priorityActions,
        matchScore
      };

    } catch (error) {
      console.error('Resume optimization failed:', error);
      return this.generateFallbackOptimization();
    }
  }

  /**
   * Generate job-specific content suggestions
   */
  async generateJobSpecificContent(
    jobTitle: string,
    company: string,
    jobDescription: string,
    userExperience: ExperienceItem[]
  ): Promise<ContentEnhancement[]> {
    try {
      const prompt = this.buildContentGenerationPrompt(
        jobTitle,
        company,
        jobDescription,
        userExperience
      );

      const request: AIRequest = {
        id: crypto.randomUUID(),
        type: 'content-generation',
        prompt,
        context: { jobTitle, company, jobDescription, userExperience },
        userId: 'job-optimization',
        priority: 'normal',
        timestamp: new Date()
      };

      const response = await this.aiClients.generateCompletion(request);
      return this.parseContentSuggestions(response.content);

    } catch (error) {
      console.error('Job-specific content generation failed:', error);
      return this.generateFallbackContentSuggestions(jobTitle, company);
    }
  }

  /**
   * Match skills and experience against job requirements
   */
  matchSkillsAndExperience(
    resume: ResumeData,
    jobAnalysis: JobAnalysis
  ): {
    skillMatches: SkillMatch[];
    experienceMatches: ExperienceMatch[];
    overallMatch: number;
  } {
    // Match skills
    const skillMatches = this.matchSkills(resume, jobAnalysis.skills);
    
    // Match experience
    const experienceMatches = this.matchExperience(resume, jobAnalysis.experience);
    
    // Calculate overall match percentage
    const overallMatch = this.calculateOverallMatch(skillMatches, experienceMatches);

    return {
      skillMatches,
      experienceMatches,
      overallMatch
    };
  }

  // Private helper methods

  private async performAIJobAnalysis(jobDescription: string): Promise<any> {
    const prompt = `
Analyze this job description and extract structured information:

Job Description:
${jobDescription}

Extract and return JSON with this structure:
{
  "keywords": {
    "technical": ["keyword1", "keyword2"],
    "soft": ["skill1", "skill2"],
    "industry": ["term1", "term2"],
    "tools": ["tool1", "tool2"],
    "certifications": ["cert1", "cert2"],
    "actionVerbs": ["verb1", "verb2"],
    "buzzwords": ["buzz1", "buzz2"]
  },
  "requirements": {
    "mustHave": ["req1", "req2"],
    "niceToHave": ["pref1", "pref2"],
    "experienceLevel": "mid",
    "yearsRequired": 3,
    "educationLevel": "Bachelor's degree"
  },
  "skills": {
    "technical": [{"skill": "JavaScript", "importance": "critical"}],
    "soft": [{"skill": "Communication", "importance": "important"}],
    "tools": [{"skill": "React", "importance": "critical"}]
  },
  "experience": {
    "relevantExperience": ["exp1", "exp2"],
    "missingExperience": ["missing1", "missing2"],
    "transferableSkills": ["skill1", "skill2"]
  },
  "culture": {
    "values": ["value1", "value2"],
    "workStyle": ["style1", "style2"],
    "environment": "collaborative",
    "teamStructure": "cross-functional"
  }
}
`;

    const request: AIRequest = {
      id: crypto.randomUUID(),
      type: 'analysis',
      prompt,
      context: { jobDescription },
      userId: 'job-analysis',
      priority: 'normal',
      timestamp: new Date()
    };

    try {
      const response = await this.aiClients.generateCompletion(request);
      return JSON.parse(response.content);
    } catch (error) {
      console.error('AI job analysis failed:', error);
      return {};
    }
  }

  private extractKeywords(jobDescription: string): JobKeywords {
    const text = jobDescription.toLowerCase();
    
    // Extract technical keywords
    const technical = this.extractPatternMatches(text, this.industryPatterns.technology);
    
    // Extract soft skills
    const softSkillPatterns = [
      /\b(communication|leadership|teamwork|problem[\s\-]solving|analytical|creative)\b/gi,
      /\b(collaboration|adaptability|time[\s\-]management|critical[\s\-]thinking)\b/gi
    ];
    const soft = this.extractPatternMatches(text, softSkillPatterns);
    
    // Extract tools and technologies
    const toolPatterns = [
      /\b(excel|word|powerpoint|outlook|slack|jira|confluence)\b/gi,
      /\b(photoshop|illustrator|figma|sketch|canva)\b/gi,
      /\b(salesforce|hubspot|marketo|mailchimp|google[\s\-]analytics)\b/gi
    ];
    const tools = this.extractPatternMatches(text, toolPatterns);
    
    // Extract action verbs
    const actionVerbPatterns = [
      /\b(manage|lead|develop|create|implement|analyze|optimize|coordinate)\b/gi,
      /\b(execute|deliver|achieve|improve|streamline|collaborate|mentor)\b/gi
    ];
    const actionVerbs = this.extractPatternMatches(text, actionVerbPatterns);

    return {
      technical: [...new Set(technical)],
      soft: [...new Set(soft)],
      industry: [],
      tools: [...new Set(tools)],
      certifications: [],
      actionVerbs: [...new Set(actionVerbs)],
      buzzwords: []
    };
  }

  private extractPatternMatches(text: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];
    
    patterns.forEach(pattern => {
      const found = text.match(pattern);
      if (found) {
        matches.push(...found.map(match => match.trim()));
      }
    });
    
    return matches;
  }

  private analyzeRequirements(jobDescription: string): RequirementAnalysis {
    const text = jobDescription.toLowerCase();
    
    // Extract years of experience
    const experienceMatches = text.match(this.requirementPatterns.experience);
    const yearsRequired = experienceMatches 
      ? parseInt(experienceMatches[0].match(/\d+/)?.[0] || '0')
      : null;
    
    // Determine experience level
    let experienceLevel: 'entry' | 'mid' | 'senior' | 'executive' = 'mid';
    if (yearsRequired !== null) {
      if (yearsRequired <= 2) experienceLevel = 'entry';
      else if (yearsRequired <= 5) experienceLevel = 'mid';
      else if (yearsRequired <= 10) experienceLevel = 'senior';
      else experienceLevel = 'executive';
    }
    
    // Extract education requirements
    const educationMatches = text.match(this.requirementPatterns.education);
    const educationLevel = educationMatches ? educationMatches[0] : null;
    
    // Split requirements into must-have and nice-to-have
    const sentences = jobDescription.split(/[.!?]+/);
    const mustHave: string[] = [];
    const niceToHave: string[] = [];
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      if (this.requirementPatterns.mustHave.test(lowerSentence)) {
        mustHave.push(sentence.trim());
      } else if (this.requirementPatterns.preferred.test(lowerSentence)) {
        niceToHave.push(sentence.trim());
      }
    });

    return {
      mustHave,
      niceToHave,
      experienceLevel,
      yearsRequired,
      educationLevel
    };
  }

  private analyzeSkillRequirements(jobDescription: string): SkillAnalysis {
    // This would be enhanced with more sophisticated analysis
    return {
      technical: [],
      soft: [],
      tools: [],
      missing: [],
      priority: 'medium'
    };
  }

  private analyzeExperienceRequirements(jobDescription: string): ExperienceAnalysis {
    return {
      relevantExperience: [],
      missingExperience: [],
      transferableSkills: [],
      recommendedHighlights: []
    };
  }

  private analyzeCulture(jobDescription: string): CultureAnalysis {
    return {
      values: [],
      workStyle: [],
      environment: 'collaborative',
      teamStructure: 'cross-functional'
    };
  }

  private analyzeResumeJobMatch(resume: ResumeData, jobAnalysis: JobAnalysis): any {
    // Analyze how well the resume matches the job requirements
    const resumeText = this.extractResumeText(resume);
    const jobKeywords = [
      ...jobAnalysis.keywords.technical,
      ...jobAnalysis.keywords.soft,
      ...jobAnalysis.keywords.tools
    ];
    
    const foundKeywords = jobKeywords.filter(keyword =>
      resumeText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return {
      keywordMatch: foundKeywords.length / jobKeywords.length,
      foundKeywords,
      missingKeywords: jobKeywords.filter(keyword =>
        !resumeText.toLowerCase().includes(keyword.toLowerCase())
      )
    };
  }

  private generateKeywordSuggestions(
    resume: ResumeData,
    jobAnalysis: JobAnalysis
  ): KeywordSuggestion[] {
    const suggestions: KeywordSuggestion[] = [];
    const resumeText = this.extractResumeText(resume);
    
    // Analyze each keyword category
    const allKeywords = [
      ...jobAnalysis.keywords.technical.map(k => ({ keyword: k, importance: 'critical' as const })),
      ...jobAnalysis.keywords.soft.map(k => ({ keyword: k, importance: 'important' as const })),
      ...jobAnalysis.keywords.tools.map(k => ({ keyword: k, importance: 'important' as const }))
    ];
    
    allKeywords.forEach(({ keyword, importance }) => {
      const currentUsage = (resumeText.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      const recommendedUsage = importance === 'critical' ? 2 : 1;
      
      if (currentUsage < recommendedUsage) {
        suggestions.push({
          keyword,
          importance,
          suggestedPlacement: this.suggestKeywordPlacement(keyword, resume),
          currentUsage,
          recommendedUsage
        });
      }
    });
    
    return suggestions.slice(0, 10); // Top 10 suggestions
  }

  private suggestKeywordPlacement(keyword: string, resume: ResumeData): string[] {
    const placements: string[] = [];
    
    // Suggest skills section if it's a technical skill
    const skillsSection = resume.sections.find(s => s.type === 'skills');
    if (skillsSection) {
      placements.push('Skills section');
    }
    
    // Suggest experience descriptions
    const experienceSection = resume.sections.find(s => s.type === 'experience');
    if (experienceSection) {
      placements.push('Experience descriptions');
    }
    
    return placements;
  }

  private generateContentEnhancements(
    resume: ResumeData,
    jobAnalysis: JobAnalysis,
    matchAnalysis: any
  ): ContentEnhancement[] {
    const enhancements: ContentEnhancement[] = [];
    
    // Suggest adding missing keywords to experience descriptions
    matchAnalysis.missingKeywords.slice(0, 5).forEach((keyword: string) => {
      enhancements.push({
        section: 'experience',
        type: 'modify',
        suggestion: `Incorporate "${keyword}" into relevant experience descriptions`,
        reasoning: `This keyword appears in the job description and would improve ATS matching`,
        impact: 'high'
      });
    });
    
    // Suggest emphasizing relevant experience
    const experienceSection = resume.sections.find(s => s.type === 'experience');
    if (experienceSection) {
      enhancements.push({
        section: 'experience',
        type: 'emphasize',
        suggestion: 'Highlight achievements that demonstrate required skills',
        reasoning: 'Quantified achievements matching job requirements will stand out to recruiters',
        impact: 'high'
      });
    }
    
    return enhancements;
  }

  private generateStructuralSuggestions(
    resume: ResumeData,
    jobAnalysis: JobAnalysis
  ): StructuralSuggestion[] {
    const suggestions: StructuralSuggestion[] = [];
    
    // Check if skills section exists and is prominent
    const skillsSection = resume.sections.find(s => s.type === 'skills');
    if (!skillsSection) {
      suggestions.push({
        type: 'add_section',
        description: 'Add a Skills section to highlight technical competencies',
        reasoning: 'The job description emphasizes specific technical skills that should be prominently displayed',
        effort: 'low'
      });
    }
    
    return suggestions;
  }

  private generatePriorityActions(
    keywordOptimization: KeywordSuggestion[],
    contentEnhancements: ContentEnhancement[],
    structuralChanges: StructuralSuggestion[]
  ): PriorityAction[] {
    const actions: PriorityAction[] = [];
    
    // High-impact keyword additions
    keywordOptimization
      .filter(k => k.importance === 'critical')
      .slice(0, 3)
      .forEach((keyword, index) => {
        actions.push({
          action: `Add "${keyword.keyword}" to ${keyword.suggestedPlacement.join(' or ')}`,
          reasoning: 'Critical keyword missing from resume',
          impact: 'high',
          effort: 'low',
          order: index + 1
        });
      });
    
    // High-impact content enhancements
    contentEnhancements
      .filter(e => e.impact === 'high')
      .slice(0, 2)
      .forEach((enhancement, index) => {
        actions.push({
          action: enhancement.suggestion,
          reasoning: enhancement.reasoning,
          impact: 'high',
          effort: 'medium',
          order: actions.length + index + 1
        });
      });
    
    return actions.sort((a, b) => a.order - b.order);
  }

  private calculateMatchScore(resume: ResumeData, jobAnalysis: JobAnalysis): number {
    const resumeText = this.extractResumeText(resume);
    const allKeywords = [
      ...jobAnalysis.keywords.technical,
      ...jobAnalysis.keywords.soft,
      ...jobAnalysis.keywords.tools
    ];
    
    const foundKeywords = allKeywords.filter(keyword =>
      resumeText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const keywordScore = (foundKeywords.length / allKeywords.length) * 100;
    
    // Additional scoring factors could be added here
    // For now, we'll use keyword matching as the primary factor
    
    return Math.round(keywordScore);
  }

  private matchSkills(resume: ResumeData, skillAnalysis: SkillAnalysis): SkillMatch[] {
    const skillsSection = resume.sections.find(s => s.type === 'skills');
    const resumeSkills: string[] = [];
    
    if (skillsSection) {
      skillsSection.items.forEach(item => {
        const skillItem = item as SkillsItem;
        resumeSkills.push(...skillItem.skills);
      });
    }
    
    // Match against required skills
    const matches: SkillMatch[] = [];
    
    [...skillAnalysis.technical, ...skillAnalysis.soft, ...skillAnalysis.tools].forEach(skillMatch => {
      const found = resumeSkills.some(skill => 
        skill.toLowerCase().includes(skillMatch.skill.toLowerCase()) ||
        skillMatch.skill.toLowerCase().includes(skill.toLowerCase())
      );
      
      matches.push({
        ...skillMatch,
        found
      });
    });
    
    return matches;
  }

  private matchExperience(resume: ResumeData, experienceAnalysis: ExperienceAnalysis): ExperienceMatch[] {
    const experienceSection = resume.sections.find(s => s.type === 'experience');
    const matches: ExperienceMatch[] = [];
    
    if (experienceSection) {
      experienceSection.items.forEach(item => {
        const expItem = item as ExperienceItem;
        
        // Calculate relevance score based on job title and description matching
        const relevanceScore = this.calculateExperienceRelevance(expItem, experienceAnalysis);
        
        matches.push({
          jobTitle: expItem.title,
          company: expItem.company,
          relevanceScore,
          matchingResponsibilities: [],
          suggestedEnhancements: []
        });
      });
    }
    
    return matches;
  }

  private calculateExperienceRelevance(
    experience: ExperienceItem,
    experienceAnalysis: ExperienceAnalysis
  ): number {
    // Simple relevance calculation based on title matching
    // In a real implementation, this would be more sophisticated
    const titleWords = experience.title.toLowerCase().split(' ');
    const relevantExperience = experienceAnalysis.relevantExperience.join(' ').toLowerCase();
    
    const matchingWords = titleWords.filter(word => 
      relevantExperience.includes(word) && word.length > 2
    );
    
    return (matchingWords.length / titleWords.length) * 100;
  }

  private calculateOverallMatch(
    skillMatches: SkillMatch[],
    experienceMatches: ExperienceMatch[]
  ): number {
    const skillScore = skillMatches.filter(s => s.found).length / skillMatches.length;
    const experienceScore = experienceMatches.reduce((sum, exp) => sum + exp.relevanceScore, 0) / 
                           (experienceMatches.length * 100);
    
    return Math.round((skillScore * 0.6 + experienceScore * 0.4) * 100);
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

  private buildContentGenerationPrompt(
    jobTitle: string,
    company: string,
    jobDescription: string,
    userExperience: ExperienceItem[]
  ): string {
    return `
Generate job-specific content suggestions for a resume targeting this position:

Job Title: ${jobTitle}
Company: ${company}

Job Description:
${jobDescription}

Current Experience:
${userExperience.map(exp => `
- ${exp.title} at ${exp.company}
  ${exp.description?.join('\n  ') || ''}
`).join('\n')}

Provide specific suggestions for:
1. Bullet points that highlight relevant experience
2. Keywords to incorporate naturally
3. Skills to emphasize
4. Achievements to quantify

Format as JSON array of content enhancement objects.
`;
  }

  private parseContentSuggestions(content: string): ContentEnhancement[] {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse content suggestions:', error);
      return [];
    }
  }

  private generateFallbackJobAnalysis(jobDescription: string): JobAnalysis {
    return {
      keywords: {
        technical: [],
        soft: [],
        industry: [],
        tools: [],
        certifications: [],
        actionVerbs: [],
        buzzwords: []
      },
      requirements: {
        mustHave: [],
        niceToHave: [],
        experienceLevel: 'mid',
        yearsRequired: null,
        educationLevel: null
      },
      skills: {
        technical: [],
        soft: [],
        tools: [],
        missing: [],
        priority: 'medium'
      },
      experience: {
        relevantExperience: [],
        missingExperience: [],
        transferableSkills: [],
        recommendedHighlights: []
      },
      culture: {
        values: [],
        workStyle: [],
        environment: 'collaborative',
        teamStructure: 'cross-functional'
      }
    };
  }

  private generateFallbackOptimization(): OptimizationSuggestions {
    return {
      keywordOptimization: [],
      contentEnhancements: [],
      structuralChanges: [],
      priorityActions: [],
      matchScore: 50
    };
  }

  private generateFallbackContentSuggestions(jobTitle: string, company: string): ContentEnhancement[] {
    return [
      {
        section: 'experience',
        type: 'modify',
        suggestion: `Tailor experience descriptions to highlight skills relevant to ${jobTitle} role`,
        reasoning: 'Generic fallback suggestion for job-specific optimization',
        impact: 'medium'
      }
    ];
  }
}

// Singleton instance
let jobOptimizationAgentInstance: JobOptimizationAgent | null = null;

export function getJobOptimizationAgent(): JobOptimizationAgent {
  if (!jobOptimizationAgentInstance) {
    jobOptimizationAgentInstance = new JobOptimizationAgent();
  }
  return jobOptimizationAgentInstance;
}