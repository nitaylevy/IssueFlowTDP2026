import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, ParseIntPipe, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './interfaces/comment.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findByTicket(@Param('ticketId', ParseIntPipe) ticketId: number): Comment[] {
    return this.commentsService.findByTicket(ticketId);
  }

  @Post()
  @HttpCode(200) // Forces a 200 OK structure instead of a 201 Created structure per contract
  create(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() createCommentDto: CreateCommentDto,
  ): Comment {
    return this.commentsService.create(ticketId, createCommentDto);
  }

  @Patch(':commentId')
  @HttpCode(200)
  update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
  ): void {
    return this.commentsService.update(ticketId, commentId, updateCommentDto);
  }

  @Delete(':commentId')
  @HttpCode(200)
  delete(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ): void {
    return this.commentsService.delete(ticketId, commentId);
  }
}