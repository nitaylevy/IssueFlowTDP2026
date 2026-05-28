import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/dto/create-user.dto';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Captured previously by JwtAuthGuard

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Administrative privileges are required to access this resource.');
    }
    return true;
  }
}