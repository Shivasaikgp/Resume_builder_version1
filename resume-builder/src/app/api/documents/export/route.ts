import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DocumentExportService } from '@/lib/document-export'
import { ExportOptions } from '@/lib/document-export/types'
import { z } from 'zod'

const ExportRequestSchema = z.object({
  resumeId: z.string().uuid(),
  format: z.enum(['pdf', 'docx']),
  filename: z.string().optional(),
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
    const validatedData = ExportRequestSchema.parse(body)

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

    // Prepare export options
    const exportOptions: ExportOptions = {
      format: validatedData.format,
      filename: validatedData.filename,
      quality: validatedData.quality || 'medium',
      includeMetadata: validatedData.includeMetadata ?? true
    }

    // Generate document
    const result = await DocumentExportService.exportDocument(
      resume.data,
      resume.templateConfig,
      exportOptions
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      )
    }

    // Return the document
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.size?.toString() || '0',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Document export error:', error)

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get export capabilities
    const capabilities = DocumentExportService.getExportCapabilities()

    return NextResponse.json({
      capabilities,
      supportedFormats: capabilities.supportedFormats,
      features: capabilities.features
    })

  } catch (error) {
    console.error('Export capabilities error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}