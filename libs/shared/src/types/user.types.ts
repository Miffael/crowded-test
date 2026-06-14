import { Role } from './role.types';

export type UserStatus = 'active' | 'blocked' | 'deleted';

export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
