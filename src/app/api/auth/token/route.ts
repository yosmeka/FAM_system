import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateTokenPair, refreshAccessToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/token - Generate JWT tokens for API access
 * Requires active session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return Response.json(
        { error: 'Unauthorized - Session required' },
        { status: 401 }
      );
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find active session
    const dbSession = await prisma.session.findFirst({
      where: {
        userId: user.id,
        expires: {
          gt: new Date()
        }
      },
      orderBy: {
        expires: 'desc'
      }
    });

    // Generate JWT tokens
    const tokens = await generateTokenPair(user, dbSession?.id);

    return Response.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        tokenType: 'Bearer'
      }
    });

  } catch (error) {
    console.error('Token generation failed:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/token - Refresh access token
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return Response.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    const tokens = await refreshAccessToken(refreshToken);

    if (!tokens) {
      return Response.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        tokenType: 'Bearer'
      }
    });

  } catch (error) {
    console.error('Token refresh failed:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
