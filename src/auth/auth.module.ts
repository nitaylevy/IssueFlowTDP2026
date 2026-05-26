// src/auth/auth.module.ts
import { Module } from '@nestjs/module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule, // Gives access to UsersService
    PassportModule,
    JwtModule.register({
      secret: 'SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION',
      signOptions: { expiresIn: '3600s' }, // 1 hour token validity
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}