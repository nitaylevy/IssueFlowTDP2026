import { TicketStatus, TicketPriority, TicketType } from '../enums/ticket.enums';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  projectId: number;
  assigneeId?: number;
  dueDate: string;
  isOverdue: boolean;
  version: number; // For avoiding simultaneous multi-user updates
}