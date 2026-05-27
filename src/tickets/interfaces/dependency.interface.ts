import { TicketStatus } from '../enums/ticket.enums';

export interface BlockerTicketSummary {
  id: number;
  title: string;
  status: TicketStatus;
}

export interface TicketDependency {
  ticketId: number;   // The ticket that is blocked
  blockedBy: number;  // The ticket causing the block
}