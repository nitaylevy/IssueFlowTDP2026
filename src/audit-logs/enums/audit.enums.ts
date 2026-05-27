export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
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