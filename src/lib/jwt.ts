import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// JWT configuration
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-here';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface UserPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Generate a pair of JWT tokens (access and refresh)
 */
export async function generateTokenPair(
  user: UserPayload,
  sessionId?: string
): Promise<TokenPair> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

  // Create access token payload
  const accessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
    sessionId,
    iat: Math.floor(now.getTime() / 1000),
  };

  // Create refresh token payload
  const refreshTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
    sessionId,
    iat: Math.floor(now.getTime() / 1000),
  };

  // Generate tokens
  const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(refreshTokenPayload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  // Store refresh token in database for validation
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      sessionId,
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

/**
 * Refresh an access token using a valid refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenPair | null> {
  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

    if (decoded.type !== 'refresh') {
      return null;
    }

    // Check if refresh token exists in database and is not expired
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!storedToken) {
      return null;
    }

    // Delete the old refresh token
    await prisma.refreshToken.delete({
      where: {
        id: storedToken.id,
      },
    });

    // Generate new token pair
    return await generateTokenPair(storedToken.user, storedToken.sessionId);
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
      },
    });

    return result.count > 0;
  } catch (error) {
    console.error('Error revoking refresh token:', error);
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<boolean> {
  try {
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
      },
    });

    return true;
  } catch (error) {
    console.error('Error revoking all user tokens:', error);
    return false;
  }
}
