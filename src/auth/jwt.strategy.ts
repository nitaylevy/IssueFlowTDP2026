// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION', // Use env variable in real app
    });
  }

  async validate(payload: { sub: number; username: string }) {
    try {
      // Find the user from the database/memory using the ID stored in the token
      return this.usersService.findOne(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid token or user no longer exists');
    }
  }
}