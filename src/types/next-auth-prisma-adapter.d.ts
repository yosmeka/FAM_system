import { PrismaClient } from '@prisma/client';

declare module '@next-auth/prisma-adapter' {
  export function PrismaAdapter(prisma: PrismaClient): any;
} 