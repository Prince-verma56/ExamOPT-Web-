import { db } from '@/server/db/index';
import { isFeatureEnabled } from '@/config/features';

export interface AuditRecord {
  actorId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Log a business-critical action.
   */
  async audit(record: AuditRecord): Promise<void> {
    if (!isFeatureEnabled('auditLogs')) {
      console.log(`[Audit Disabled] Action: ${record.action} by ${record.actorId} on ${record.resource}:${record.resourceId}`);
      return;
    }

    try {
      await db.auditLog.create({
        data: {
          actorId: record.actorId,
          action: record.action,
          resource: record.resource,
          resourceId: record.resourceId,
          metadata: record.metadata || {},
        },
      });
    } catch (error) {
      console.error('[AuditService] Failed to create audit log', error);
      // Depending on strictness, we might want to throw here, but usually audit log failure shouldn't crash the core transaction
    }
  }

  /**
   * Retrieve audit logs for a specific resource
   */
  async getLogsForResource(resource: string, resourceId: string) {
    if (!isFeatureEnabled('auditLogs')) return [];
    
    return await db.auditLog.findMany({
      where: { resource, resourceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const auditService = new AuditService();
