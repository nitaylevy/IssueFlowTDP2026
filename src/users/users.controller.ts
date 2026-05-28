import { Controller, Get, Post, Body, Param, Delete, HttpCode, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CommentsService } from '../comments/comments.service';
import { MentionQueryDto } from '../comments/dto/mention-query.dto';
import { PaginatedMentionsResponse } from '../comments/interfaces/mention-response.interface';
import { User } from './interfaces/user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly commentsService: CommentsService, 
  ) {}

  @Get()
  findAll(): User[] {
    return this.usersService.findAll();
  }

  @Get(':userId')
  findOne(@Param('userId', ParseIntPipe) userId: number): User {
    return this.usersService.findOne(userId);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto): User {
    return this.usersService.create(createUserDto);
  }

  @Post('update/:userId')
  @HttpCode(200) // NestJS defaults POST requests to 201; this forces it to 200 OK per your spec
  update(
    @Param('userId', ParseIntPipe) userId: number, 
    @Body() updateUserDto: UpdateUserDto
  ): void {
    return this.usersService.update(userId, updateUserDto);
  }

  @Delete(':userId')
  @HttpCode(200)
  delete(@Param('userId', ParseIntPipe) userId: number): void {
    return this.usersService.delete(userId);
  }

  @Get(':userId/mentions')
  getUserMentions(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: MentionQueryDto,
  ): PaginatedMentionsResponse {
    return this.commentsService.findUserMentions(userId, query);
  }
}