export type Role = 'ADMIN' | 'MANAGER' | 'USER' | 'AUDITOR';

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  emailVerified?: Date | null;
  image?: string | null;
}

export interface Session {
  user: User;
  expires: string;
} 