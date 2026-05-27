import { AuditAction, AuditEntityType, AuditActorType } from '../enums/audit.enums';

export class AuditQueryDto {
  entityType?: AuditEntityType;
  entityId?: string; // Kept as string in query inputs, parsed later
  action?: AuditAction;
  actor?: AuditActorType;
}