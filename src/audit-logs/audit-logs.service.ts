import { Injectable } from '@nestjs/common';
import { AuditLog } from './interfaces/audit-log.interface';
import { AuditAction, AuditEntityType, AuditActorType } from './enums/audit.enums';
import { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditLogsService {
  private logs: AuditLog[] = [];
  private idCounter = 1;

  // Append-only tracking method called by other modules internally
  log(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: number,
    performedBy: number,
    actor: AuditActorType = AuditActorType.USER,
  ): void {
    const newLog: AuditLog = {
      id: this.idCounter++,
      action,
      entityType,
      entityId,
      performedBy,
      actor,
      timestamp: new Date().toISOString(),
    };
    this.logs.push(newLog);
  }

  // Retrieval with dynamic conditional filters
  findAll(query: AuditQueryDto): AuditLog[] {
    return this.logs.filter((log) => {
      if (query.entityType && log.entityType !== query.entityType) return false;
      if (query.action && log.action !== query.action) return false;
      if (query.actor && log.actor !== query.actor) return false;
      if (query.entityId && log.entityId !== parseInt(query.entityId, 10)) return false;
      return true;
    });
  }
}