import { UserRole } from '../dto/create-user.dto';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
}