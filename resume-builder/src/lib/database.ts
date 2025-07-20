import { PrismaClient } from '@prisma/client'
import { getDatabaseOptimizer } from './database/query-optimizer'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Get optimized database service
export const dbOptimizer = getDatabaseOptimizer(prisma)

// Database utility functions
export class DatabaseService {
  // User operations
  static async createUser(email: string, name?: string) {
    return prisma.user.create({
      data: {
        email,
        name,
      },
    })
  }

  static async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        resumes: {
          orderBy: { updatedAt: 'desc' },
        },
        userContext: true,
      },
    })
  }

  static async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        resumes: {
          orderBy: { updatedAt: 'desc' },
        },
        userContext: true,
      },
    })
  }

  // Resume operations
  static async createResume(userId: string, title: string, data: any, templateConfig: any) {
    return prisma.resume.create({
      data: {
        userId,
        title,
        data,
        templateConfig,
      },
    })
  }

  static async getResumeById(id: string) {
    return prisma.resume.findUnique({
      where: { id },
      include: {
        user: true,
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
  }

  static async updateResume(id: string, data: Partial<{
    title: string
    data: any
    templateConfig: any
    metadata: any
  }>) {
    return prisma.resume.update({
      where: { id },
      data,
    })
  }

  static async deleteResume(id: string) {
    return prisma.resume.delete({
      where: { id },
    })
  }

  static async duplicateResume(id: string, newTitle: string) {
    const originalResume = await prisma.resume.findUnique({
      where: { id },
    })

    if (!originalResume) {
      throw new Error('Resume not found')
    }

    return prisma.resume.create({
      data: {
        userId: originalResume.userId,
        title: newTitle,
        data: originalResume.data,
        templateConfig: originalResume.templateConfig,
        metadata: {
          ...originalResume.metadata,
          originalResumeId: id,
          duplicatedAt: new Date().toISOString(),
        },
      },
    })
  }

  static async getUserResumes(userId: string) {
    return prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
  }

  // User Context operations
  static async createOrUpdateUserContext(userId: string, contextData: any) {
    return prisma.userContext.upsert({
      where: { userId },
      update: {
        contextData,
      },
      create: {
        userId,
        contextData,
      },
    })
  }

  static async getUserContext(userId: string) {
    return prisma.userContext.findUnique({
      where: { userId },
    })
  }

  // Resume Analysis operations
  static async createResumeAnalysis(resumeId: string, score: number, analysisData: any) {
    return prisma.resumeAnalysis.create({
      data: {
        resumeId,
        score,
        analysisData,
      },
    })
  }

  static async getResumeAnalyses(resumeId: string, limit = 10) {
    return prisma.resumeAnalysis.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  static async getLatestResumeAnalysis(resumeId: string) {
    return prisma.resumeAnalysis.findFirst({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Cleanup and maintenance
  static async deleteOldAnalyses(resumeId: string, keepCount = 5) {
    const analyses = await prisma.resumeAnalysis.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
      skip: keepCount,
      select: { id: true },
    })

    if (analyses.length > 0) {
      await prisma.resumeAnalysis.deleteMany({
        where: {
          id: {
            in: analyses.map(a => a.id),
          },
        },
      })
    }
  }
}