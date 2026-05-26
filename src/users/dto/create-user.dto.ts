export enum UserRole {
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
}

export class CreateUserDto {
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
}