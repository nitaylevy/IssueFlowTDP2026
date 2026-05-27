import { AuditAction, AuditEntityType, AuditActorType } from '../enums/audit.enums';

export interface AuditLog {
  id: number;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: number;
  performedBy: number; // The userId or 0 if performed by SYSTEM
  actor: AuditActorType;
  timestamp: string; // ISO String format
}