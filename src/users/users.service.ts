import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { User } from './interfaces/user.interface';
import { UserRole } from './dto/create-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private users: User[] = [];
  private idCounter = 1; // Tracks auto-incrementing numeric IDs

  create(createUserDto: CreateUserDto): User {
    if (!Object.values(UserRole).includes(createUserDto.role)) {
      throw new BadRequestException(`Role must be one of: ${Object.values(UserRole).join(', ')}`);
    }

    const userExists = this.users.find(
      (u) => u.username === createUserDto.username || u.email === createUserDto.email,
    );
    if (userExists) {
      throw new BadRequestException('Username or Email already exists.');
    }

    const newUser: User = {
      id: this.idCounter++,
      ...createUserDto,
    };

    this.users.push(newUser);
    return newUser;
  }

  findAll(): User[] {
    return this.users;
  }

  findOne(id: number): User {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto): void {
    const user = this.findOne(id);

    if (updateUserDto.role && !Object.values(UserRole).includes(updateUserDto.role)) {
      throw new BadRequestException(`Role must be one of: ${Object.values(UserRole).join(', ')}`);
    }

    if (updateUserDto.fullName) user.fullName = updateUserDto.fullName;
    if (updateUserDto.role) user.role = updateUserDto.role;
    
    // Per your API spec, this returns nothing (200 OK with empty body or primitive validation)
    return;
  }

  delete(id: number): void {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.users.splice(userIndex, 1);
    return;
  }
}