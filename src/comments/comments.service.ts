import { Injectable, NotFoundException } from '@nestjs/common';
import { Comment, MentionedUserSummary } from './interfaces/comment.interface';
import { PaginatedMentionsResponse } from './interfaces/mention-response.interface';
import { MentionQueryDto } from './dto/mention-query.dto';
import { TicketsService } from '../tickets/tickets.service';
import { UsersService } from '../users/users.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  private comments: Comment[] = [];
  private idCounter = 1;

  constructor(
    private ticketsService: TicketsService,
    private usersService: UsersService,
  ) {}

  // Helper method to look for @usernames (Case-Insensitive matching enforced)
  private parseMentions(content: string): MentionedUserSummary[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    if (!matches) return [];

    const mentionedUsers: MentionedUserSummary[] = [];
    const allUsers = this.usersService.findAll();

    for (const match of matches) {
      const username = match.substring(1); // Strip the '@' symbol
      const foundUser = allUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
      
      if (foundUser && !mentionedUsers.some((u) => u.id === foundUser.id)) {
        mentionedUsers.push({
          id: foundUser.id,
          username: foundUser.username,
          fullName: foundUser.fullName,
        });
      }
    }

    return mentionedUsers;
  }

  create(ticketId: number, createCommentDto: CreateCommentDto): Comment {
    this.ticketsService.findOne(ticketId);
    this.usersService.findOne(createCommentDto.authorId);

    const newComment: Comment = {
      id: this.idCounter++,
      ticketId,
      authorId: createCommentDto.authorId,
      content: createCommentDto.content,
      mentionedUsers: this.parseMentions(createCommentDto.content),
      version: 1,
    };

    this.comments.push(newComment);
    return newComment;
  }

  findByTicket(ticketId: number): Comment[] {
    this.ticketsService.findOne(ticketId);
    return this.comments.filter((c) => c.ticketId === ticketId);
  }

  update(ticketId: number, commentId: number, updateCommentDto: UpdateCommentDto): void {
    this.ticketsService.findOne(ticketId);
    const comment = this.comments.find((c) => c.id === commentId && c.ticketId === ticketId);

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found on ticket ${ticketId}`);
    }

    comment.content = updateCommentDto.content;
    // Feature: On comment update the mention list is completely re-evaluated automatically
    comment.mentionedUsers = this.parseMentions(updateCommentDto.content);
    comment.version++;
    
    return;
  }

  delete(ticketId: number, commentId: number): void {
    this.ticketsService.findOne(ticketId);
    const index = this.comments.findIndex((c) => c.id === commentId && c.ticketId === ticketId);

    if (index === -1) {
      throw new NotFoundException(`Comment with ID ${commentId} not found on ticket ${ticketId}`);
    }

    this.comments.splice(index, 1);
  }

  findUserMentions(userId: number, query: MentionQueryDto): PaginatedMentionsResponse {
    // Confirm the targeted target user exists
    this.usersService.findOne(userId);

    // 1. Filter: find matching mentions
    // 2. Sort: Newest first (highest comment record ID first)
    const matchingComments = this.comments
      .filter((comment) => comment.mentionedUsers.some((u) => u.id === userId))
      .sort((a, b) => b.id - a.id);

    // Set fallback defaults for pagination handling parameters
    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 10;
    
    // Calculate index slicing bounds
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    const paginatedData = matchingComments.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: matchingComments.length,
      page: page,
    };
  }
}