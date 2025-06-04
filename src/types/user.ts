export type Role = 'USER' | 'ADMIN' | 'MANAGER' | 'AUDITOR';

export interface User {
  id: string;
  name?: string | null;
  email: string;
  role: Role;
  emailVerified?: Date | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
