import { TicketStatus, TicketPriority } from '../enums/ticket.enums';

export class UpdateTicketDto {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: number;
  dueDate?: string;
  version?: number; // Used for concurrency control to ensure matching version states
}