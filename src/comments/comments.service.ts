import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Comment, MentionedUserSummary } from './interfaces/comment.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { TicketsService } from '../tickets/tickets.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class CommentsService {
  private comments: Comment[] = [];
  private idCounter = 1;

  constructor(
    private ticketsService: TicketsService,
    private usersService: UsersService,
  ) {}

  // Helper method to look for @usernames and map them to real system users
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
    // Ensure the ticket and author user exist
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
    this.ticketsService.findOne(ticketId); // Validate ticket exists first
    return this.comments.filter((c) => c.ticketId === ticketId);
  }

  update(ticketId: number, commentId: number, updateCommentDto: UpdateCommentDto): void {
    this.ticketsService.findOne(ticketId);
    const comment = this.comments.find((c) => c.id === commentId && c.ticketId === ticketId);

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found on ticket ${ticketId}`);
    }

    // Guard against simultaneous multi-user modifications
    if (updateCommentDto.version && comment.version !== updateCommentDto.version) {
      throw new ConflictException('This comment was modified by another user. Please try again.');
    }

    comment.content = updateCommentDto.content;
    comment.mentionedUsers = this.parseMentions(updateCommentDto.content);
    comment.version++; // Bump version lock tracking counter
    
    return;
  }

  delete(ticketId: number, commentId: number): void {
    this.ticketsService.findOne(ticketId);
    const index = this.comments.findIndex((c) => c.id === commentId && c.ticketId === ticketId);

    if (index === -1) {
      throw new NotFoundException(`Comment with ID ${commentId} not found on ticket ${ticketId}`);
    }

    this.comments.splice(index, 1);
    return;
  }
}