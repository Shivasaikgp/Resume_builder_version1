import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ResumeData } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause for filtering
    const where: any = {
      userId: session.user.id,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { metadata: { path: ['targetJob'], string_contains: search } },
        { metadata: { path: ['targetCompany'], string_contains: search } },
        { metadata: { path: ['notes'], string_contains: search } },
      ];
    }

    if (tags && tags.length > 0) {
      where.metadata = {
        path: ['tags'],
        array_contains: tags,
      };
    }

    const resumes = await prisma.resume.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        title: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            score: true,
            analysisData: true,
          },
        },
      },
    });

    return NextResponse.json({ resumes });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, data, templateConfig, metadata } = body;

    if (!title || !data) {
      return NextResponse.json(
        { error: 'Title and data are required' },
        { status: 400 }
      );
    }

    const resume = await prisma.resume.create({
      data: {
        userId: session.user.id,
        title,
        data,
        templateConfig: templateConfig || {},
        metadata: {
          version: 1,
          tags: [],
          ...metadata,
        },
      },
    });

    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    console.error('Error creating resume:', error);
    return NextResponse.json(
      { error: 'Failed to create resume' },
      { status: 500 }
    );
  }
}