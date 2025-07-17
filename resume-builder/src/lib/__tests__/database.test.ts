import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { DatabaseService } from '../database'

// Use a test database or mock Prisma for testing
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
})

describe('DatabaseService', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.resumeAnalysis.deleteMany()
    await prisma.userContext.deleteMany()
    await prisma.resume.deleteMany()
    await prisma.user.deleteMany()
  })

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.resumeAnalysis.deleteMany()
    await prisma.userContext.deleteMany()
    await prisma.resume.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('User operations', () => {
    it('should create a user', async () => {
      const user = await DatabaseService.createUser('test@example.com', 'Test User')
      
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.id).toBeDefined()
      expect(user.createdAt).toBeInstanceOf(Date)
    })

    it('should get user by id', async () => {
      const createdUser = await DatabaseService.createUser('test@example.com', 'Test User')
      const user = await DatabaseService.getUserById(createdUser.id)
      
      expect(user).toBeDefined()
      expect(user?.email).toBe('test@example.com')
      expect(user?.resumes).toBeDefined()
      expect(user?.userContext).toBeDefined()
    })

    it('should get user by email', async () => {
      await DatabaseService.createUser('test@example.com', 'Test User')
      const user = await DatabaseService.getUserByEmail('test@example.com')
      
      expect(user).toBeDefined()
      expect(user?.email).toBe('test@example.com')
    })
  })

  describe('Resume operations', () => {
    let userId: string

    beforeEach(async () => {
      const user = await DatabaseService.createUser('test@example.com', 'Test User')
      userId = user.id
    })

    it('should create a resume', async () => {
      const resumeData = {
        personalInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
        },
        sections: [],
      }

      const templateConfig = {
        layout: 'modern',
        colorScheme: 'blue',
        fontSize: 'medium',
        spacing: 'normal',
      }

      const resume = await DatabaseService.createResume(
        userId,
        'Test Resume',
        resumeData,
        templateConfig
      )

      expect(resume.title).toBe('Test Resume')
      expect(resume.userId).toBe(userId)
      expect(resume.data).toEqual(resumeData)
      expect(resume.templateConfig).toEqual(templateConfig)
    })

    it('should get resume by id', async () => {
      const resumeData = {
        personalInfo: { fullName: 'Test User', email: 'test@example.com' },
        sections: [],
      }
      const templateConfig = { layout: 'modern' }

      const createdResume = await DatabaseService.createResume(
        userId,
        'Test Resume',
        resumeData,
        templateConfig
      )

      const resume = await DatabaseService.getResumeById(createdResume.id)
      
      expect(resume).toBeDefined()
      expect(resume?.title).toBe('Test Resume')
      expect(resume?.user).toBeDefined()
      expect(resume?.analyses).toBeDefined()
    })

    it('should update resume', async () => {
      const resumeData = {
        personalInfo: { fullName: 'Test User', email: 'test@example.com' },
        sections: [],
      }
      const templateConfig = { layout: 'modern' }

      const createdResume = await DatabaseService.createResume(
        userId,
        'Test Resume',
        resumeData,
        templateConfig
      )

      const updatedResume = await DatabaseService.updateResume(createdResume.id, {
        title: 'Updated Resume',
      })

      expect(updatedResume.title).toBe('Updated Resume')
    })

    it('should duplicate resume', async () => {
      const resumeData = {
        personalInfo: { fullName: 'Test User', email: 'test@example.com' },
        sections: [],
      }
      const templateConfig = { layout: 'modern' }

      const originalResume = await DatabaseService.createResume(
        userId,
        'Original Resume',
        resumeData,
        templateConfig
      )

      const duplicatedResume = await DatabaseService.duplicateResume(
        originalResume.id,
        'Duplicated Resume'
      )

      expect(duplicatedResume.title).toBe('Duplicated Resume')
      expect(duplicatedResume.data).toEqual(originalResume.data)
      expect(duplicatedResume.templateConfig).toEqual(originalResume.templateConfig)
      expect(duplicatedResume.metadata).toHaveProperty('originalResumeId', originalResume.id)
    })

    it('should get user resumes', async () => {
      const resumeData = {
        personalInfo: { fullName: 'Test User', email: 'test@example.com' },
        sections: [],
      }
      const templateConfig = { layout: 'modern' }

      await DatabaseService.createResume(userId, 'Resume 1', resumeData, templateConfig)
      await DatabaseService.createResume(userId, 'Resume 2', resumeData, templateConfig)

      const resumes = await DatabaseService.getUserResumes(userId)
      
      expect(resumes).toHaveLength(2)
      expect(resumes[0].title).toBe('Resume 2') // Should be ordered by updatedAt desc
      expect(resumes[1].title).toBe('Resume 1')
    })
  })

  describe('User Context operations', () => {
    let userId: string

    beforeEach(async () => {
      const user = await DatabaseService.createUser('test@example.com', 'Test User')
      userId = user.id
    })

    it('should create user context', async () => {
      const contextData = {
        profile: {
          industry: 'Technology',
          experienceLevel: 'mid' as const,
          targetRoles: ['Software Engineer'],
          skills: ['JavaScript'],
          careerGoals: ['Lead projects'],
        },
      }

      const userContext = await DatabaseService.createOrUpdateUserContext(userId, contextData)
      
      expect(userContext.userId).toBe(userId)
      expect(userContext.contextData).toEqual(contextData)
    })

    it('should update existing user context', async () => {
      const initialData = { profile: { industry: 'Technology' } }
      const updatedData = { profile: { industry: 'Healthcare' } }

      await DatabaseService.createOrUpdateUserContext(userId, initialData)
      const updatedContext = await DatabaseService.createOrUpdateUserContext(userId, updatedData)
      
      expect(updatedContext.contextData).toEqual(updatedData)
    })

    it('should get user context', async () => {
      const contextData = { profile: { industry: 'Technology' } }
      
      await DatabaseService.createOrUpdateUserContext(userId, contextData)
      const userContext = await DatabaseService.getUserContext(userId)
      
      expect(userContext).toBeDefined()
      expect(userContext?.contextData).toEqual(contextData)
    })
  })

  describe('Resume Analysis operations', () => {
    let resumeId: string

    beforeEach(async () => {
      const user = await DatabaseService.createUser('test@example.com', 'Test User')
      const resume = await DatabaseService.createResume(
        user.id,
        'Test Resume',
        { personalInfo: { fullName: 'Test', email: 'test@example.com' }, sections: [] },
        { layout: 'modern' }
      )
      resumeId = resume.id
    })

    it('should create resume analysis', async () => {
      const analysisData = {
        overallScore: 85,
        breakdown: { content: 88, formatting: 82, atsCompatibility: 85, keywords: 80 },
        suggestions: [],
        strengths: ['Good content'],
        improvements: ['Add metrics'],
      }

      const analysis = await DatabaseService.createResumeAnalysis(resumeId, 85, analysisData)
      
      expect(analysis.resumeId).toBe(resumeId)
      expect(analysis.score).toBe(85)
      expect(analysis.analysisData).toEqual(analysisData)
    })

    it('should get resume analyses', async () => {
      const analysisData = {
        overallScore: 85,
        breakdown: { content: 88, formatting: 82, atsCompatibility: 85, keywords: 80 },
        suggestions: [],
        strengths: [],
        improvements: [],
      }

      await DatabaseService.createResumeAnalysis(resumeId, 85, analysisData)
      await DatabaseService.createResumeAnalysis(resumeId, 90, analysisData)

      const analyses = await DatabaseService.getResumeAnalyses(resumeId)
      
      expect(analyses).toHaveLength(2)
      expect(analyses[0].score).toBe(90) // Should be ordered by createdAt desc
      expect(analyses[1].score).toBe(85)
    })

    it('should get latest resume analysis', async () => {
      const analysisData = {
        overallScore: 85,
        breakdown: { content: 88, formatting: 82, atsCompatibility: 85, keywords: 80 },
        suggestions: [],
        strengths: [],
        improvements: [],
      }

      await DatabaseService.createResumeAnalysis(resumeId, 85, analysisData)
      await DatabaseService.createResumeAnalysis(resumeId, 90, analysisData)

      const latestAnalysis = await DatabaseService.getLatestResumeAnalysis(resumeId)
      
      expect(latestAnalysis).toBeDefined()
      expect(latestAnalysis?.score).toBe(90)
    })
  })
})