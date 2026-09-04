import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditAction } from '@prisma/client';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import { sanitizePayload } from '../utils/sanitizer.util';

const MUTATIVE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    // Apenas mutações são registradas para evitar sobrecarga com buscas repetitivas (GET)
    if (!MUTATIVE_METHODS.has(method)) {
      return next.handle();
    }

    const startTime = Date.now();
    const url = request.originalUrl || request.url || '';
    const ipAddress = request.ip || request.headers?.['x-forwarded-for'] || null;
    const userAgent = request.headers?.['user-agent'] || null;
    const userId = request.user?.id || request.user?.userId || null;
    const familyId =
      request.body?.familyId ||
      request.query?.familyId ||
      request.params?.familyId ||
      null;

    const action = this.resolveAction(method, url);
    const { entityName, entityId } = this.resolveEntity(url, request.params);
    const sanitizedBody = sanitizePayload(request.body);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response?.statusCode || 200;
        const durationMs = Date.now() - startTime;

        this.auditLogsService.createLog({
          userId,
          familyId,
          entityName,
          entityId,
          action,
          method,
          endpoint: url,
          ipAddress: typeof ipAddress === 'string' ? ipAddress.slice(0, 45) : null,
          userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 255) : null,
          statusCode,
          durationMs,
          newData: sanitizedBody,
        });
      }),
      catchError((error) => {
        const durationMs = Date.now() - startTime;
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

        if (error instanceof HttpException) {
          statusCode = error.getStatus();
        } else if (error?.status) {
          statusCode = error.status;
        }

        this.auditLogsService.createLog({
          userId,
          familyId,
          entityName,
          entityId,
          action,
          method,
          endpoint: url,
          ipAddress: typeof ipAddress === 'string' ? ipAddress.slice(0, 45) : null,
          userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 255) : null,
          statusCode,
          durationMs,
          newData: sanitizedBody,
          metadata: {
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });

        return throwError(() => error);
      }),
    );
  }

  private resolveAction(method: string, url: string): AuditAction {
    if (url.includes('/auth/login')) {
      return AuditAction.LOGIN;
    }
    if (url.includes('/auth/logout')) {
      return AuditAction.LOGOUT;
    }
    if (url.includes('/restore')) {
      return AuditAction.RESTORE;
    }

    switch (method) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.OTHER;
    }
  }

  private resolveEntity(url: string, params: Record<string, any> = {}): { entityName: string | null; entityId: string | null } {
    const cleanUrl = url.split('?')[0];
    const segments = cleanUrl.split('/').filter(Boolean);

    let entityName: string | null = null;
    let entityId: string | null = params?.id || null;

    if (segments.length > 0) {
      const first = segments[0];
      // Mapeamento de endpoints comuns para o nome da entidade
      const entityMap: Record<string, string> = {
        transactions: 'Transaction',
        accounts: 'Account',
        'credit-cards': 'CreditCard',
        categories: 'Category',
        goals: 'Goal',
        budgets: 'Budget',
        families: 'Family',
        users: 'User',
        auth: 'Auth',
      };
      entityName = entityMap[first] || first;
    }

    if (!entityId && segments.length > 1) {
      const candidateId = segments[1];
      // Se tiver formato de UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId)) {
        entityId = candidateId;
      }
    }

    return { entityName, entityId };
  }
}
