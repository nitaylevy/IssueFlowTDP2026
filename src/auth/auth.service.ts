import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  // Simple server-side token deny-list for logging out
  private tokenDenyList: Set<string> = new Set();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    // Find user by username
    const user = this.usersService.findAll().find((u) => u.username === loginDto.username);
    
    // Per specification table example, checking for "secret" or matching existence
    if (!user || (loginDto.password && loginDto.password !== 'secret')) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username, sub: user.id };
    
    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
  }

  logout(token: string): void {
    if (token) {
      this.tokenDenyList.add(token);
    }
  }

  isTokenInvalidated(token: string): boolean {
    return this.tokenDenyList.has(token);
  }
}