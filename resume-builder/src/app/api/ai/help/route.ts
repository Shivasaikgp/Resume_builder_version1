// Contextual help API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { getContentGenerationAgent } from '../../../../lib/ai';
import { z } from 'zod';

const HelpRequestSchema = z.object({
  content: z.string(),
  section: z.string(),
  context: z.object({
    profile: z.object({
      industry: z.string().optional(),
      experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
      targetRoles: z.array(z.string()).default([]),
      skills: z.array(z.string()).default([]),
      careerGoals: z.array(z.string()).default([])
    }).optional(),
    preferences: z.object({
      writingStyle: z.enum(['formal', 'casual', 'technical']).default('formal'),
      contentLength: z.enum(['concise', 'detailed']).default('detailed'),
      focusAreas: z.array(z.string()).default([])
    }).optional()
  }).optional(),
  helpType: z.enum(['general', 'improvement', 'examples', 'best_practices']).default('general')
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = HelpRequestSchema.parse(body);
    const { content, section, context, helpType } = validatedData;

    // Generate contextual help based on type
    let help: string;
    
    switch (helpType) {
      case 'improvement':
        help = generateImprovementHelp(content, section, context);
        break;
      case 'examples':
        help = generateExampleHelp(section, context);
        break;
      case 'best_practices':
        help = generateBestPracticesHelp(section, context);
        break;
      default:
        help = generateGeneralHelp(content, section, context);
    }

    // Get additional AI-powered insights if content is substantial
    let aiInsights = null;
    if (content.length > 50) {
      try {
        aiInsights = await generateAIInsights(content, section, context);
      } catch (error) {
        console.error('Failed to generate AI insights:', error);
      }
    }

    return NextResponse.json({
      success: true,
      help,
      aiInsights,
      helpType,
      metadata: {
        section,
        contentLength: content.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Contextual help error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate help' },
      { status: 500 }
    );
  }
}

function generateGeneralHelp(content: string, section: string, context: any): string {
  const experienceLevel = context?.profile?.experienceLevel || 'mid';
  const industry = context?.profile?.industry || 'general';
  const writingStyle = context?.preferences?.writingStyle || 'formal';
  
  const contentLength = content.length;
  const hasNumbers = /\d/.test(content);
  const hasActionVerbs = /^(Led|Managed|Developed|Implemented|Created|Built|Designed|Achieved|Delivered|Improved)/i.test(content);
  
  let help = '';
  
  switch (section) {
    case 'experience':
      help = `**Experience Section Tips for ${experienceLevel} ${industry} roles:**\n\n`;
      
      if (!hasActionVerbs) {
        help += '• **Start with strong action verbs**: Use words like "Led," "Developed," "Achieved," or "Implemented" to begin each bullet point.\n';
      }
      
      if (!hasNumbers) {
        help += '• **Add quantifiable results**: Include percentages, dollar amounts, team sizes, or time frames to demonstrate impact.\n';
      }
      
      if (contentLength < 100) {
        help += '• **Expand with specifics**: Add details about technologies used, team sizes, project scope, or business impact.\n';
      }
      
      help += `• **Match your ${writingStyle} style**: `;
      if (writingStyle === 'technical') {
        help += 'Include specific technologies, methodologies, and technical achievements.\n';
      } else if (writingStyle === 'formal') {
        help += 'Use professional language and focus on business outcomes.\n';
      } else {
        help += 'Keep it conversational but professional, focusing on your contributions.\n';
      }
      
      break;
      
    case 'skills':
      help = `**Skills Section Tips:**\n\n`;
      help += '• **Group by category**: Separate technical skills, soft skills, and tools/technologies.\n';
      help += '• **Prioritize relevance**: List skills most relevant to your target roles first.\n';
      help += '• **Be specific**: Instead of "Programming," list "Python, JavaScript, React.js"\n';
      help += '• **Include proficiency levels**: Consider adding years of experience or proficiency levels for key skills.\n';
      break;
      
    case 'summary':
      help = `**Professional Summary Tips:**\n\n`;
      help += '• **Keep it concise**: 2-3 sentences highlighting your unique value proposition.\n';
      help += `• **Match your level**: As a ${experienceLevel} professional, focus on `;
      
      if (experienceLevel === 'entry') {
        help += 'education, internships, projects, and eagerness to learn.\n';
      } else if (experienceLevel === 'senior' || experienceLevel === 'executive') {
        help += 'leadership experience, strategic impact, and industry expertise.\n';
      } else {
        help += 'key achievements, relevant skills, and career progression.\n';
      }
      
      help += '• **Include keywords**: Use terms from job descriptions you\'re targeting.\n';
      break;
      
    case 'education':
      help = `**Education Section Tips:**\n\n`;
      help += '• **List most recent first**: Start with your highest or most recent degree.\n';
      help += '• **Include relevant details**: GPA (if 3.5+), honors, relevant coursework, or projects.\n';
      
      if (experienceLevel === 'entry') {
        help += '• **Expand with details**: Include relevant coursework, projects, and academic achievements.\n';
      } else {
        help += '• **Keep it concise**: Focus on degrees and certifications most relevant to your career.\n';
      }
      
      break;
      
    default:
      help = `**${section.charAt(0).toUpperCase() + section.slice(1)} Section Tips:**\n\n`;
      help += '• **Be specific and relevant**: Focus on information that supports your career goals.\n';
      help += '• **Use consistent formatting**: Maintain the same style throughout your resume.\n';
      help += '• **Quantify when possible**: Include numbers, dates, and measurable outcomes.\n';
  }
  
  return help;
}

function generateImprovementHelp(content: string, section: string, context: any): string {
  const issues = [];
  const suggestions = [];
  
  // Analyze content for common issues
  if (content.length < 50) {
    issues.push('Content is quite brief');
    suggestions.push('Add more specific details about your responsibilities and achievements');
  }
  
  if (!/\d/.test(content)) {
    issues.push('No quantifiable metrics found');
    suggestions.push('Include numbers, percentages, or measurable outcomes to demonstrate impact');
  }
  
  if (!/^(Led|Managed|Developed|Implemented|Created|Built|Designed|Achieved|Delivered|Improved)/i.test(content)) {
    issues.push('Weak or missing action verbs');
    suggestions.push('Start bullet points with strong action verbs like "Led," "Developed," or "Achieved"');
  }
  
  if (content.split(' ').length > 50) {
    issues.push('Content might be too lengthy');
    suggestions.push('Consider condensing to focus on the most impactful achievements');
  }
  
  let help = '**Content Analysis & Improvement Suggestions:**\n\n';
  
  if (issues.length > 0) {
    help += '**Areas for Improvement:**\n';
    issues.forEach(issue => help += `• ${issue}\n`);
    help += '\n';
  }
  
  if (suggestions.length > 0) {
    help += '**Specific Suggestions:**\n';
    suggestions.forEach(suggestion => help += `• ${suggestion}\n`);
  } else {
    help += '**Great job!** Your content looks well-structured. Consider adding more specific metrics or achievements to make it even stronger.';
  }
  
  return help;
}

function generateExampleHelp(section: string, context: any): string {
  const experienceLevel = context?.profile?.experienceLevel || 'mid';
  const industry = context?.profile?.industry || 'technology';
  
  let help = `**Example ${section.charAt(0).toUpperCase() + section.slice(1)} Content:**\n\n`;
  
  switch (section) {
    case 'experience':
      help += `**${experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)}-Level ${industry} Examples:**\n\n`;
      
      if (experienceLevel === 'entry') {
        help += '• Developed responsive web application using React.js and Node.js, serving 500+ daily users\n';
        help += '• Collaborated with 3-person development team to deliver project 2 weeks ahead of schedule\n';
        help += '• Implemented automated testing suite, reducing bug reports by 40%\n';
      } else if (experienceLevel === 'senior') {
        help += '• Led cross-functional team of 8 engineers to deliver $2M revenue-generating platform\n';
        help += '• Architected microservices infrastructure, improving system performance by 60%\n';
        help += '• Mentored 4 junior developers, with 100% retention and 2 internal promotions\n';
      } else {
        help += '• Developed and maintained web applications using React.js and Python, supporting 1,000+ users\n';
        help += '• Optimized database queries, reducing page load times by 35%\n';
        help += '• Collaborated with product team to implement 15+ new features based on user feedback\n';
      }
      break;
      
    case 'skills':
      help += '**Technical Skills:**\n';
      help += '• Programming Languages: Python, JavaScript, TypeScript, Java\n';
      help += '• Frameworks & Libraries: React.js, Node.js, Django, Express.js\n';
      help += '• Databases: PostgreSQL, MongoDB, Redis\n';
      help += '• Tools & Technologies: Docker, AWS, Git, Jenkins\n\n';
      help += '**Soft Skills:**\n';
      help += '• Project Management, Team Leadership, Problem Solving, Communication\n';
      break;
      
    case 'summary':
      if (experienceLevel === 'entry') {
        help += 'Recent Computer Science graduate with hands-on experience in full-stack development through internships and personal projects. Proficient in React.js, Python, and agile methodologies with a passion for creating user-centered applications.';
      } else if (experienceLevel === 'senior') {
        help += 'Senior Software Engineer with 8+ years of experience leading development teams and architecting scalable web applications. Proven track record of delivering high-impact projects that drive business growth and improve user experience.';
      } else {
        help += 'Experienced Software Developer with 4+ years building robust web applications using modern technologies. Strong background in full-stack development with expertise in React.js, Python, and cloud platforms.';
      }
      break;
      
    default:
      help += 'Examples will vary based on your specific experience and industry. Focus on concrete achievements and quantifiable results.';
  }
  
  return help;
}

function generateBestPracticesHelp(section: string, context: any): string {
  let help = `**Best Practices for ${section.charAt(0).toUpperCase() + section.slice(1)} Section:**\n\n`;
  
  switch (section) {
    case 'experience':
      help += '**Structure & Format:**\n';
      help += '• Use reverse chronological order (most recent first)\n';
      help += '• Include job title, company, location, and dates\n';
      help += '• Use 3-5 bullet points per role\n';
      help += '• Keep bullet points to 1-2 lines each\n\n';
      
      help += '**Content Guidelines:**\n';
      help += '• Start each bullet with a strong action verb\n';
      help += '• Focus on achievements, not just responsibilities\n';
      help += '• Quantify results with numbers, percentages, or metrics\n';
      help += '• Use keywords relevant to your target industry\n';
      help += '• Avoid personal pronouns (I, me, my)\n\n';
      
      help += '**ATS Optimization:**\n';
      help += '• Use standard job titles and industry terminology\n';
      help += '• Include relevant technical skills and tools\n';
      help += '• Avoid graphics, tables, or unusual formatting\n';
      help += '• Use standard section headings\n';
      break;
      
    case 'skills':
      help += '**Organization:**\n';
      help += '• Group similar skills together (Technical, Languages, Tools)\n';
      help += '• List most relevant skills first\n';
      help += '• Use consistent formatting throughout\n\n';
      
      help += '**Content:**\n';
      help += '• Be specific (React.js vs. JavaScript frameworks)\n';
      help += '• Include proficiency levels when relevant\n';
      help += '• Match skills to job requirements\n';
      help += '• Update regularly as you learn new skills\n';
      break;
      
    case 'summary':
      help += '**Length & Structure:**\n';
      help += '• Keep to 2-4 sentences or 50-100 words\n';
      help += '• Write in third person without pronouns\n';
      help += '• Place at the top of your resume\n\n';
      
      help += '**Content Focus:**\n';
      help += '• Highlight your unique value proposition\n';
      help += '• Include years of experience and key skills\n';
      help += '• Mention your career goals or target role\n';
      help += '• Use keywords from job descriptions\n';
      break;
      
    default:
      help += '• Use consistent formatting throughout your resume\n';
      help += '• Focus on relevance to your target roles\n';
      help += '• Keep information current and accurate\n';
      help += '• Proofread carefully for errors\n';
  }
  
  return help;
}

async function generateAIInsights(content: string, section: string, context: any): Promise<string> {
  // This would typically call the AI service for deeper insights
  // For now, return a structured analysis
  
  const wordCount = content.split(' ').length;
  const hasMetrics = /(\d+%|\$\d+|increased|decreased|improved|reduced)/i.test(content);
  const actionVerbCount = (content.match(/^(Led|Managed|Developed|Implemented|Created|Built|Designed|Achieved|Delivered|Improved)/gim) || []).length;
  
  let insights = '**AI-Powered Content Analysis:**\n\n';
  
  insights += `• **Content Length**: ${wordCount} words `;
  if (wordCount < 20) {
    insights += '(consider expanding with more details)\n';
  } else if (wordCount > 60) {
    insights += '(consider condensing for better impact)\n';
  } else {
    insights += '(good length)\n';
  }
  
  insights += `• **Quantifiable Metrics**: ${hasMetrics ? 'Found' : 'None detected'} `;
  if (!hasMetrics) {
    insights += '(add numbers, percentages, or measurable outcomes)\n';
  } else {
    insights += '(excellent for demonstrating impact)\n';
  }
  
  insights += `• **Action Verbs**: ${actionVerbCount} strong action verbs detected\n`;
  
  // Add section-specific insights
  if (section === 'experience') {
    const techTerms = (content.match(/\b(React|Python|JavaScript|AWS|Docker|SQL|API|Git|Agile|Scrum)\b/gi) || []).length;
    insights += `• **Technical Terms**: ${techTerms} industry keywords found\n`;
  }
  
  return insights;
}