import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get full user profile with context
    const userProfile = await getUserProfile(user.id);

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        image: userProfile.image,
        createdAt: userProfile.createdAt,
      },
      context: userProfile.userContext?.contextData || null,
      recentResumes: userProfile.resumes.map(resume => ({
        id: resume.id,
        title: resume.title,
        updatedAt: resume.updatedAt,
        latestScore: resume.analyses[0]?.score || null,
      })),
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}