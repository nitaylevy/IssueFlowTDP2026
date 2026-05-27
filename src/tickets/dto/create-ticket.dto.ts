import { TicketStatus, TicketPriority, TicketType } from '../enums/ticket.enums';

export class CreateTicketDto {
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  projectId: number;
  assigneeId?: number;
  dueDate: string; // ISO String format
}