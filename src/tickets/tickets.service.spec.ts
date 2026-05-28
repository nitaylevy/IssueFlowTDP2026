// src/tickets/tickets.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TicketStatus, TicketPriority, TicketType } from './enums/ticket.enums';
import { UserRole } from '../users/dto/create-user.dto';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('TicketsService (Business Logic Rules)', () => {
  let service: TicketsService;
  let mockProjectsService: any;
  let mockUsersService: any;
  let mockAuditLogsService: any;

  beforeEach(async () => {
    // 1. Create Mock stubs for injected global services
    mockProjectsService = { findOne: jest.fn().mockReturnValue({ id: 1 }) };
    mockUsersService = {
      findOne: jest.fn().mockReturnValue({ id: 1, role: UserRole.DEVELOPER }),
      findAll: jest.fn().mockReturnValue([
        { id: 1, username: 'dev1', role: UserRole.DEVELOPER },
        { id: 2, username: 'dev2', role: UserRole.DEVELOPER },
      ]),
    };
    mockAuditLogsService = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  // --- RULE 1: IMMUTABILITY CONSTRAINT ---
  it('should reject any updates if the ticket status is already DONE', () => {
    const ticket = service.create({
      title: 'Done Ticket',
      description: '...',
      status: TicketStatus.DONE,
      priority: TicketPriority.LOW,
      type: TicketType.BUG,
      projectId: 1,
      assigneeId: 1,
      dueDate: new Date().toISOString(),
    });

    expect(() => {
      service.update(ticket.id, { title: 'Attempted Title Mutate' });
    }).toThrow(BadRequestException);
  });

  // --- RULE 2: CONCURRENCY OPTIMISTIC LOCKING ---
  it('should throw a ConflictException if incoming mutation version mismatch occurs', () => {
    const ticket = service.create({
      title: 'Race Condition Test',
      description: '...',
      status: TicketStatus.TODO,
      priority: TicketPriority.LOW,
      type: TicketType.FEATURE,
      projectId: 1,
      assigneeId: 1,
      dueDate: new Date().toISOString(),
    });

    // Version is 1. Simulating an outdated client sending version 0 or an old snapshot
    expect(() => {
      service.update(ticket.id, { title: 'Fast Update', version: 99 });
    }).toThrow(ConflictException);
  });

  // --- RULE 3: LIFECYCLE FORWARD-ONLY TRANSITIONS ---
  it('should block backward status transitions (e.g., IN_PROGRESS back to TODO)', () => {
    const ticket = service.create({
      title: 'Lifecycle Test',
      description: '...',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.MEDIUM,
      type: TicketType.TECHNICAL,
      projectId: 1,
      assigneeId: 1,
      dueDate: new Date().toISOString(),
    });

    expect(() => {
      service.update(ticket.id, { status: TicketStatus.TODO });
    }).toThrow(BadRequestException);
  });

  // --- RULE 4: UNRESOLVED BLOCKERS CONSTRAINT ---
  it('should stop a ticket from transitioning to DONE if it has unresolved dependencies', () => {
    const blocker = service.create({
      title: 'Blocker Ticket',
      description: '...',
      status: TicketStatus.TODO,
      priority: TicketPriority.HIGH,
      type: TicketType.BUG,
      projectId: 1,
      assigneeId: 1,
      dueDate: new Date().toISOString(),
    });

    const target = service.create({
      title: 'Target Ticket',
      description: '...',
      status: TicketStatus.TODO,
      priority: TicketPriority.LOW,
      type: TicketType.FEATURE,
      projectId: 1,
      assigneeId: 1,
      dueDate: new Date().toISOString(),
    });

    // Bind dependency link: target is blocked by blocker
    service.addDependency(target.id, blocker.id);

    // Attempting to move target to DONE while blocker is still TODO must fail
    expect(() => {
      service.update(target.id, { status: TicketStatus.DONE });
    }).toThrow(BadRequestException);
  });

  // --- RULE 5: AUTO-ASSIGNMENT BY WORKLOAD ---
  it('should automatically assign a new ticket to the least-loaded developer', () => {
    // Dev 1 has 1 open ticket
    service.create({
      title: 'Dev 1 Task',
      description: '...',
      status: TicketStatus.TODO,
      priority: TicketPriority.LOW,
      type: TicketType.BUG,
      projectId: 1,
      assigneeId: 1, // Dev 1
      dueDate: new Date().toISOString(),
    });

    // Dev 2 has 0 open tickets. Creating a ticket without assigneeId should select Dev 2
    const autoAssignedTicket = service.create({
      title: 'Auto Assigned Task',
      description: '...',
      status: TicketStatus.TODO,
      priority: TicketPriority.MEDIUM,
      type: TicketType.FEATURE,
      projectId: 1,
      dueDate: new Date().toISOString(),
    });

    expect(autoAssignedTicket.assigneeId).toEqual(2); // Should select Dev 2
    expect(mockAuditLogsService.log).toHaveBeenCalled(); // Should log SYSTEM event
  });
});