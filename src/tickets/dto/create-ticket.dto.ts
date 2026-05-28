import { IsString, IsNotEmpty, IsEnum, IsInt, IsOptional, IsISO8601 } from 'class-validator';
import { TicketStatus, TicketPriority, TicketType } from '../enums/ticket.enums';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is a required field and cannot be blank.' })
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(TicketStatus, { message: 'Status must be one of: TODO, IN_PROGRESS, IN_REVIEW, DONE' })
  status: TicketStatus;

  @IsEnum(TicketPriority, { message: 'Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL' })
  priority: TicketPriority;

  @IsEnum(TicketType, { message: 'Type must be one of: BUG, FEATURE, TECHNICAL' })
  type: TicketType;

  @IsInt({ message: 'projectId must be a valid system integer.' })
  projectId: number;

  @IsOptional()
  @IsInt()
  assigneeId?: number;

  @IsISO8601({}, { message: 'dueDate must be a valid ISO-8601 datetime format string.' })
  dueDate: string;
}