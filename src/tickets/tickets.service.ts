import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Ticket } from './interfaces/ticket.interface';
import { TicketDependency, BlockerTicketSummary } from './interfaces/dependency.interface';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketStatus, TicketPriority, TicketType } from './enums/ticket.enums';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { Attachment } from './interfaces/attachment.interface';
import { AuditLogsService } from '@src/audit-logs/audit-logs.service';
import { AuditAction, AuditEntityType, AuditActorType } from '../audit-logs/enums/audit.enums';
import { UserRole } from '../users/dto/create-user.dto';

@Injectable()
export class TicketsService {
  private tickets: Ticket[] = [];
  private dependencies: TicketDependency[] = []; // In-memory dependency tracking store
  private idCounter = 1;
  private attachments: Attachment[] = []; // In-memory file registry store
  private attachmentIdCounter = 1; // Tracks attachment IDs independently

  private readonly priorityOrder = [
    TicketPriority.LOW,
    TicketPriority.MEDIUM,
    TicketPriority.HIGH,
    TicketPriority.CRITICAL
  ];

  // Lifecycle map to enforce forward-only transitions
  private readonly statusOrder = [TicketStatus.TODO, TicketStatus.IN_PROGRESS, TicketStatus.IN_REVIEW, TicketStatus.DONE];

  constructor(
    private projectsService: ProjectsService,
    private usersService: UsersService,
    private auditLogsService: AuditLogsService, // Inject audit logs to handle SYSTEM tracking
  ) {}

  // --- STEP 2: THE AUTO-ESCALATION ENGINE ---
  public runAutoEscalationEngine(): void {
    const now = new Date();

    this.tickets.forEach((ticket) => {
      // Constraints check: Ignore resolved, deleted, or tickets missing a due date
      if (ticket.status === TicketStatus.DONE || ticket.isDeleted || !ticket.dueDate) {
        return;
      }

      const dueDate = new Date(ticket.dueDate);

      // Check if the current time has surpassed the deadline
      if (now > dueDate) {
        if (ticket.priority !== TicketPriority.CRITICAL) {
          // Promote priority up exactly one level: LOW -> MEDIUM -> HIGH -> CRITICAL
          const currentIndex = this.priorityOrder.indexOf(ticket.priority);
          ticket.priority = this.priorityOrder[currentIndex + 1];
          ticket.lastEscalatedAt = now.toISOString();
          ticket.version++; // Increment tracking state version mutations
        } else {
          // Constraint: Idempotent if already CRITICAL, flip isOverdue flag to true
          if (!ticket.isOverdue) {
            ticket.isOverdue = true;
            ticket.version++;
          }
        }
      }
    });
  }

  // Helper method to dynamically recalculate overdue state
  private checkOverdue(ticket: Ticket): boolean {
    if (ticket.status === TicketStatus.DONE) return false;
    return new Date() > new Date(ticket.dueDate);
  }

  create(createTicketDto: CreateTicketDto): Ticket {
    // 1. Validate parent project exists
    this.projectsService.findOne(createTicketDto.projectId);
    
    let assignedId = createTicketDto.assigneeId;
    let autoAssignedTriggered = false;

    // 2. Workload Auto Assignment Algorithm Execution
    if (!assignedId) {
      // Find all DEVELOPER users in the system, sorted by ID ascending (oldest registrant first)
      const developers = this.usersService.findAll()
        .filter((u) => u.role === UserRole.DEVELOPER)
        .sort((a, b) => a.id - b.id);

      if (developers.length > 0) {
        let leastLoadedDevId = null;
        let lowestWorkload = Infinity;

        for (const dev of developers) {
          // Count non-DONE tickets assigned to this developer in this specific project
          const openCount = this.tickets.filter(
            (t) => t.projectId === createTicketDto.projectId && 
                   t.assigneeId === dev.id && 
                   t.status !== TicketStatus.DONE &&
                   !t.isDeleted
          ).length;

          // Strictly lower checks respect our older registration sorting order as a tie-breaker
          if (openCount < lowestWorkload) {
            lowestWorkload = openCount;
            leastLoadedDevId = dev.id;
          }
        }

        if (leastLoadedDevId !== null) {
          assignedId = leastLoadedDevId;
          autoAssignedTriggered = true;
        }
      }
    } else {
      // Direct explicit assignment validation guard
      this.usersService.findOne(assignedId);
    }

    // 3. Build and persist ticket record
    const newTicket: Ticket = {
      id: this.idCounter++,
      title: createTicketDto.title,
      description: createTicketDto.description,
      status: createTicketDto.status,
      priority: createTicketDto.priority,
      type: createTicketDto.type,
      projectId: createTicketDto.projectId,
      assigneeId: assignedId || null,
      dueDate: createTicketDto.dueDate,
      isOverdue: false,
      version: 1,
      isDeleted: false,
    };

    this.tickets.push(newTicket);

    // 4. Record Auto-Assignment in the Audit Log if triggered
    if (autoAssignedTriggered && assignedId) {
      this.auditLogsService.log(
        AuditAction.AUTO_ASSIGN,
        AuditEntityType.TICKET,
        newTicket.id,
        0, // 0 indicates the system performed the action
        AuditActorType.SYSTEM,
      );
    }

    return newTicket;
  }

  findByProject(projectId: number): Ticket[] {
    return this.tickets
      .filter((t) => t.projectId === projectId && !t.isDeleted)
      .map((t) => ({ ...t, isOverdue: this.checkOverdue(t) }));
  }

  findOne(id: number): Ticket {
    const ticket = this.tickets.find((t) => t.id === id && !t.isDeleted);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    ticket.isOverdue = this.checkOverdue(ticket);
    return ticket;
  }

  delete(id: number): void {
    const ticket = this.tickets.find((t) => t.id === id && !t.isDeleted);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    ticket.isDeleted = true; // Flagged as soft-deleted
    return;
  }

  update(id: number, updateTicketDto: UpdateTicketDto): void {
    const ticket = this.findOne(id); // Throws 404 if deleted or missing

    if (ticket.status === TicketStatus.DONE) {
      throw new BadRequestException('A ticket cannot be updated once it is marked as DONE');
    }

    if (updateTicketDto.version && ticket.version !== updateTicketDto.version) {
      throw new ConflictException('The ticket was modified by another user.');
    }

    // Standard lifecycle routing state verification
    if (updateTicketDto.status && updateTicketDto.status !== ticket.status) {
      const currentIdx = this.statusOrder.indexOf(ticket.status);
      const nextIdx = this.statusOrder.indexOf(updateTicketDto.status);
      if (nextIdx < currentIdx) {
        throw new BadRequestException('Backward status transitions are not allowed.');
      }
    }

    // --- CRITICAL MANUAL RESET CONSTRAINT ---
    // If a human changes the priority manually, reset the escalation state flags
    if (updateTicketDto.priority && updateTicketDto.priority !== ticket.priority) {
      ticket.priority = updateTicketDto.priority;
      ticket.isOverdue = false; // "is_overdue is cleared, and the next cycle re-evaluates"
    }

    // Apply remainder properties updates cleanly
    if (updateTicketDto.title) ticket.title = updateTicketDto.title;
    if (updateTicketDto.description) ticket.description = updateTicketDto.description;
    if (updateTicketDto.status) ticket.status = updateTicketDto.status;
    if (updateTicketDto.assigneeId) {
      this.usersService.findOne(updateTicketDto.assigneeId);
      ticket.assigneeId = updateTicketDto.assigneeId;
    }
    if (updateTicketDto.dueDate) {
      ticket.dueDate = updateTicketDto.dueDate;
      ticket.isOverdue = false; // Reset if due date changes manually
    }

    ticket.version++;
    return;
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
    this.findOne(ticketId);

    const blockerIds = this.dependencies
      .filter((d) => d.ticketId === ticketId)
      .map((d) => d.blockedBy);

    return this.tickets
      .filter((t) => blockerIds.includes(t.id) && !t.isDeleted)
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
    
    const rows = projectTickets.map((t) => {
      // Helper function to escape standard RFC 4180 CSV values safely
      const escapeCsvField = (val: string | number | undefined | null): string => {
        if (val === undefined || val === null) return '';
        let str = String(val);
        // If the string contains quotes, commas, or newlines, wrap it in quotes and double the existing quotes
        if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
          str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        t.id,
        escapeCsvField(t.title),
        escapeCsvField(t.description),
        t.status,
        t.priority,
        t.type,
        t.assigneeId || ''
      ].join(',');
    }).join('\n');

    return header + rows;
  }

  private parseCsvRow(rowText: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      const nextChar = rowText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Handled escaped quote ("") -> append a single quote and skip the next character
          currentField += '"';
          i++;
        } else {
          // Toggle inside/outside quotes block tracking
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Encountered delimiter comma outside of a quote boundary -> finalize current cell
        fields.push(currentField);
        currentField = '';
      } else {
        // Safe character -> append directly to current working field accumulator
        currentField += char;
      }
    }
    fields.push(currentField); // Push final cell block
    return fields;
  }

  getProjectWorkload(projectId: number) {
    this.projectsService.findOne(projectId); // Throws 404 if project doesn't exist

    // Find all DEVELOPER users in the application
    const developers = this.usersService.findAll().filter((u) => u.role === UserRole.DEVELOPER);

    const workloadList = developers.map((dev) => {
      const openTicketCount = this.tickets.filter(
        (t) => t.projectId === projectId && 
               t.assigneeId === dev.id && 
               t.status !== TicketStatus.DONE &&
               !t.isDeleted
      ).length;

      return {
        userId: dev.id,
        username: dev.username,
        openTicketCount,
      };
    });

    // Sort by openTicketCount ascending per API specification criteria
    return workloadList.sort((a, b) => a.openTicketCount - b.openTicketCount);
  }

  importFromCsv(csvBufferString: string, projectId: number): { created: number; failed: number; errors: string[] } {
    this.projectsService.findOne(projectId); // Confirm project target container exists

    // Normalize newlines and cleanly isolate lines
    const lines = csvBufferString.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    
    // Discard column headers row
    if (lines.length > 0) lines.shift();

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const columns = this.parseCsvRow(lines[i]);

        // Expect at least 6 core tracking elements to form a complete valid row payload
        if (columns.length < 6) {
          throw new Error(`Invalid line layout pattern. Parsed only ${columns.length} columns.`);
        }

        const title = columns[1];
        const description = columns[2];
        const status = columns[3] as any;
        const priority = columns[4] as any;
        const type = columns[5] as any;
        const assigneeId = columns[6] && columns[6].trim() !== '' ? parseInt(columns[6], 10) : undefined;

        // Pass structured data directly down through existing validation/creation pipeline
        this.create({
          title,
          description,
          status,
          priority,
          type,
          projectId,
          assigneeId,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default auto-fall-back date structure
        });

        created++;
      } catch (err: any) {
        failed++;
        errors.push(`Row ${i + 2}: ${err.message || 'Parsing failure encountered'}`);
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

  findSoftDeletedByProject(projectId: number): Ticket[] {
    return this.tickets.filter((t) => t.projectId === projectId && t.isDeleted);
  }

  restore(id: number): void {
    const ticket = this.tickets.find((t) => t.id === id && t.isDeleted);
    if (!ticket) {
      throw new NotFoundException(`Soft-deleted ticket with ID ${id} not found.`);
    }
    ticket.isDeleted = false;
    return;
  }
}