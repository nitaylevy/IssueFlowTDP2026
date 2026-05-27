import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Ticket } from './interfaces/ticket.interface';
import { TicketDependency, BlockerTicketSummary } from './interfaces/dependency.interface';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketStatus, TicketPriority, TicketType } from './enums/ticket.enums';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { Attachment } from './interfaces/attachment.interface';

@Injectable()
export class TicketsService {
  private tickets: Ticket[] = [];
  private dependencies: TicketDependency[] = []; // In-memory dependency tracking store
  private idCounter = 1;
  private attachments: Attachment[] = []; // In-memory file registry store
  private attachmentIdCounter = 1; // Tracks attachment IDs independently

  // Lifecycle map to enforce forward-only transitions
  private readonly statusOrder = [TicketStatus.TODO, TicketStatus.IN_PROGRESS, TicketStatus.IN_REVIEW, TicketStatus.DONE];

  constructor(
    private projectsService: ProjectsService,
    private usersService: UsersService
  ) {}

  // Helper method to dynamically recalculate overdue state
  private checkOverdue(ticket: Ticket): boolean {
    if (ticket.status === TicketStatus.DONE) return false;
    return new Date() > new Date(ticket.dueDate);
  }

  create(createTicketDto: CreateTicketDto): Ticket {
    // Validate project existence
    this.projectsService.findOne(createTicketDto.projectId);
    
    // Validate assignee existence if provided
    if (createTicketDto.assigneeId) {
      this.usersService.findOne(createTicketDto.assigneeId);
    }

    const newTicket: Ticket = {
      id: this.idCounter++,
      ...createTicketDto,
      isOverdue: false,
      version: 1, // Base version starts at 1
    };

    newTicket.isOverdue = this.checkOverdue(newTicket);
    this.tickets.push(newTicket);
    return newTicket;
  }

  findByProject(projectId: number): Ticket[] {
    return this.tickets
      .filter((t) => t.projectId === projectId)
      .map((t) => ({ ...t, isOverdue: this.checkOverdue(t) }));
  }

  findOne(id: number): Ticket {
    const ticket = this.tickets.find((t) => t.id === id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    ticket.isOverdue = this.checkOverdue(ticket);
    return ticket;
  }

  update(id: number, updateTicketDto: UpdateTicketDto): void {
    const ticket = this.findOne(id);

    // 1. Immutable Constraint: Can't modify if already DONE
    if (ticket.status === TicketStatus.DONE) {
      throw new BadRequestException('A ticket cannot be updated once it is marked as DONE');
    }

    // 2. Concurrency Constraint: Optimistic locking version validation
    if (updateTicketDto.version && ticket.version !== updateTicketDto.version) {
      throw new ConflictException('The ticket was modified by another user. Please reload and try again.');
    }

    // 3. Status Lifecycle Routing Rule (Forward-Only Check)
    if (updateTicketDto.status && updateTicketDto.status !== ticket.status) {
      const currentIndex = this.statusOrder.indexOf(ticket.status);
      const nextIndex = this.statusOrder.indexOf(updateTicketDto.status);

      if (nextIndex < currentIndex) {
        throw new BadRequestException(
          `Backward status transitions are not allowed. Current: ${ticket.status}, Attempted: ${updateTicketDto.status}`
        );
      }

      // 4. Dependency Validation Constraint: Ensure all blockers are DONE before moving target to DONE
      if (updateTicketDto.status === TicketStatus.DONE) {
        const blockers = this.getDependencies(id);
        const hasUnresolvedBlockers = blockers.some((blocker) => blocker.status !== TicketStatus.DONE);
        
        if (hasUnresolvedBlockers) {
          throw new BadRequestException(`Cannot mark ticket as DONE because it has unresolved blockers.`);
        }
      }
    }

    // Apply updates
    if (updateTicketDto.title) ticket.title = updateTicketDto.title;
    if (updateTicketDto.description) ticket.description = updateTicketDto.description;
    if (updateTicketDto.status) ticket.status = updateTicketDto.status;
    if (updateTicketDto.priority) ticket.priority = updateTicketDto.priority;
    if (updateTicketDto.assigneeId) {
      this.usersService.findOne(updateTicketDto.assigneeId);
      ticket.assigneeId = updateTicketDto.assigneeId;
    }
    if (updateTicketDto.dueDate) ticket.dueDate = updateTicketDto.dueDate;

    ticket.version++; // Increment version on every successful update mutation
    return;
  }

  delete(id: number): void {
    const index = this.tickets.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    
    // Cascade clean: clean out any active dependency bindings referencing this deleted ticket
    this.dependencies = this.dependencies.filter(
      (d) => d.ticketId !== id && d.blockedBy !== id
    );

    this.tickets.splice(index, 1);
  }

  // --- Ticket Dependency Management Methods ---

  addDependency(ticketId: number, blockedById: number): void {
    const targetTicket = this.findOne(ticketId);
    const blockerTicket = this.findOne(blockedById);

    // Guard: Prevent self-referencing loops
    if (ticketId === blockedById) {
      throw new BadRequestException('A ticket cannot depend on itself.');
    }

    // Constraint: Both tickets must belong to the same project
    if (targetTicket.projectId !== blockerTicket.projectId) {
      throw new BadRequestException('Both tickets must belong to the same project.');
    }

    // Guard: Prevent double-binding the same blocker dependency link
    const linkExists = this.dependencies.some((d) => d.ticketId === ticketId && d.blockedBy === blockedById);
    if (!linkExists) {
      this.dependencies.push({ ticketId, blockedBy: blockedById });
    }
  }

  getDependencies(ticketId: number): BlockerTicketSummary[] {
    this.findOne(ticketId); // Ensures target ticket actually exists

    const blockerIds = this.dependencies
      .filter((d) => d.ticketId === ticketId)
      .map((d) => d.blockedBy);

    return this.tickets
      .filter((t) => blockerIds.includes(t.id))
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
      }));
  }

  removeDependency(ticketId: number, blockerId: number): void {
    this.findOne(ticketId);
    this.findOne(blockerId);

    const index = this.dependencies.findIndex((d) => d.ticketId === ticketId && d.blockedBy === blockerId);
    if (index === -1) {
      throw new NotFoundException(`Dependency link between Ticket ${ticketId} and Blocker ${blockerId} not found.`);
    }

    this.dependencies.splice(index, 1);
  }

  // --- CSV Import/Export Support System ---

  exportToCsv(projectId: number): string {
    const projectTickets = this.findByProject(projectId);
    const header = 'id,title,description,status,priority,type,assigneeId\n';
    
    const rows = projectTickets.map((t) => 
      `${t.id},"${t.title.replace(/"/g, '""')}","${t.description.replace(/"/g, '""')}",${t.status},${t.priority},${t.type},${t.assigneeId || ''}`
    ).join('\n');

    return header + rows;
  }

  importFromCsv(csvBufferString: string, projectId: number): { created: number; failed: number; errors: string[] } {
    this.projectsService.findOne(projectId); // Confirm project exists

    const lines = csvBufferString.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    // Remove headers line
    lines.shift();

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        // Basic naive CSV splitter (Comma isolated strings assuming simplified fields)
        const columns = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (columns.length < 6) {
          throw new Error('Insufficient columns structure');
        }

        const title = columns[1].replace(/^"|"$/g, '');
        const description = columns[2].replace(/^"|"$/g, '');
        const status = columns[3] as TicketStatus;
        const priority = columns[4] as TicketPriority;
        const type = columns[5] as TicketType;
        const assigneeId = columns[6] ? parseInt(columns[6], 10) : undefined;

        this.create({
          title,
          description,
          status,
          priority,
          type,
          projectId,
          assigneeId,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days future due-date
        });

        created++;
      } catch (err: any) {
        failed++;
        errors.push(`Row ${i + 2}: ${err.message || 'Parsing error'}`);
      }
    }

    return { created, failed, errors };
  }

  addAttachment(ticketId: number, file: Express.Multer.File): Attachment {
    this.findOne(ticketId); // Confirm the parent ticket exists first

    const newAttachment: Attachment = {
      id: this.attachmentIdCounter++,
      ticketId,
      filename: file.originalname,
      contentType: file.mimetype,
      buffer: file.buffer,
    };

    this.attachments.push(newAttachment);
    
    return newAttachment;
  }

  removeAttachment(ticketId: number, attachmentId: number): void {
    this.findOne(ticketId); // Confirm the parent ticket exists

    const index = this.attachments.findIndex(
      (a) => a.id === attachmentId && a.ticketId === ticketId
    );

    if (index === -1) {
      throw new NotFoundException(`Attachment with ID ${attachmentId} not found on ticket ${ticketId}`);
    }

    this.attachments.splice(index, 1);
    return;
  }
}