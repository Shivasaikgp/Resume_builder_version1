import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DocumentExportService } from '@/lib/document-export'
import { DocumentFormat } from '@/lib/document-export/types'
import { z } from 'zod'

const BatchExportRequestSchema = z.object({
  resumeId: z.string().uuid(),
  formats: z.array(z.enum(['pdf', 'docx'])).min(1),
  quality: z.enum(['low', 'medium', 'high']).optional(),
  includeMetadata: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = BatchExportRequestSchema.parse(body)

    // Fetch resume data
    const resume = await prisma.resume.findFirst({
      where: {
        id: validatedData.resumeId,
        userId: session.user.id
      }
    })

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    // Generate documents for all formats
    const results = await DocumentExportService.exportMultipleFormats(
      resume.data,
      resume.templateConfig,
      validatedData.formats,
      {
        quality: validatedData.quality || 'medium',
        includeMetadata: validatedData.includeMetadata ?? true
      }
    )

    // Prepare response with base64 encoded data for JSON transport
    const response: Record<string, any> = {}
    
    for (const [format, result] of Object.entries(results)) {
      if (result.success && result.data) {
        response[format] = {
          success: true,
          filename: result.filename,
          mimeType: result.mimeType,
          size: result.size,
          data: result.data.toString('base64')
        }
      } else {
        response[format] = {
          success: false,
          error: result.error,
          filename: result.filename,
          mimeType: result.mimeType
        }
      }
    }

    return NextResponse.json({
      success: true,
      results: response,
      resumeTitle: resume.title,
      exportedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Batch export error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}