export type Role = 'USER' | 'ADMIN';

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
