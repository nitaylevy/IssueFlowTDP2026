export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  AUTO_ASSIGN = 'AUTO_ASSIGN',
}

export enum AuditEntityType {
  USER = 'USER',
  PROJECT = 'PROJECT',
  TICKET = 'TICKET',
  COMMENT = 'COMMENT',
}

export enum AuditActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}