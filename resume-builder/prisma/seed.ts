import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  })

  // Create initial user context
  await prisma.userContext.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      contextData: {
        profile: {
          industry: 'Technology',
          experienceLevel: 'mid',
          targetRoles: ['Software Engineer', 'Full Stack Developer'],
          skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
          careerGoals: ['Lead technical projects', 'Mentor junior developers'],
        },
        preferences: {
          writingStyle: 'professional',
          contentLength: 'detailed',
          focusAreas: ['technical skills', 'leadership'],
        },
        history: {
          interactions: [],
          feedbackPatterns: [],
          improvementAreas: [],
        },
      },
    },
  })

  // Create a sample resume
  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: 'Software Engineer Resume',
      data: {
        personalInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
          phone: '+1 (555) 123-4567',
          location: 'San Francisco, CA',
          linkedin: 'linkedin.com/in/testuser',
          github: 'github.com/testuser',
        },
        sections: [
          {
            type: 'experience',
            title: 'Professional Experience',
            items: [
              {
                title: 'Senior Software Engineer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                startDate: '2022-01',
                endDate: 'present',
                description: [
                  'Led development of microservices architecture serving 1M+ users',
                  'Mentored 3 junior developers and improved team productivity by 25%',
                  'Implemented CI/CD pipelines reducing deployment time by 60%',
                ],
              },
            ],
          },
          {
            type: 'education',
            title: 'Education',
            items: [
              {
                degree: 'Bachelor of Science in Computer Science',
                school: 'University of California, Berkeley',
                location: 'Berkeley, CA',
                graduationDate: '2020',
                gpa: '3.8',
              },
            ],
          },
          {
            type: 'skills',
            title: 'Technical Skills',
            items: [
              {
                category: 'Programming Languages',
                skills: ['JavaScript', 'TypeScript', 'Python', 'Java'],
              },
              {
                category: 'Frameworks & Libraries',
                skills: ['React', 'Node.js', 'Express', 'Next.js'],
              },
            ],
          },
        ],
      },
      templateConfig: {
        layout: 'modern',
        colorScheme: 'blue',
        fontSize: 'medium',
        spacing: 'normal',
      },
      metadata: {
        version: '1.0',
        lastAnalyzed: new Date().toISOString(),
        tags: ['software-engineer', 'full-stack'],
      },
    },
  })

  // Create a sample resume analysis
  await prisma.resumeAnalysis.create({
    data: {
      resumeId: resume.id,
      score: 85,
      analysisData: {
        overallScore: 85,
        breakdown: {
          content: 88,
          formatting: 82,
          atsCompatibility: 85,
          keywords: 80,
        },
        suggestions: [
          {
            type: 'content',
            priority: 'medium',
            message: 'Add more quantifiable achievements to your experience section',
            section: 'experience',
          },
          {
            type: 'keywords',
            priority: 'low',
            message: 'Consider adding more industry-specific keywords',
            section: 'skills',
          },
        ],
        strengths: [
          'Strong quantifiable achievements',
          'Clear and concise formatting',
          'Relevant technical skills',
        ],
        improvements: [
          'Add more specific metrics to achievements',
          'Include more industry keywords',
        ],
      },
    },
  })

  console.log('Database seeded successfully!')
  console.log(`Created user: ${user.email}`)
  console.log(`Created resume: ${resume.title}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })