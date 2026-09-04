import { AuditAction } from '@prisma/client';

export interface CreateAuditLogInput {
  userId?: string | null;
  familyId?: string | null;
  entityName?: string | null;
  entityId?: string | null;
  action?: AuditAction;
  method: string;
  endpoint: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  oldData?: any;
  newData?: any;
  metadata?: any;
}
