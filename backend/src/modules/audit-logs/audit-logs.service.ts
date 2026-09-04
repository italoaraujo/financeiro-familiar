import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogInput } from './dto/create-audit-log.input';
import { FindAuditLogsDto } from './dto/find-audit-logs.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grava um log de auditoria de forma não-bloqueante e resiliente.
   * Se ocorrer falha no banco de dados, o erro é registrado no logger e não propaga exceção.
   */
  async createLog(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId || null,
          familyId: input.familyId || null,
          entityName: input.entityName || null,
          entityId: input.entityId || null,
          action: input.action,
          method: input.method,
          endpoint: input.endpoint,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          statusCode: input.statusCode || null,
          durationMs: input.durationMs || null,
          oldData: input.oldData !== undefined ? input.oldData : Prisma.DbNull,
          newData: input.newData !== undefined ? input.newData : Prisma.DbNull,
          metadata: input.metadata !== undefined ? input.metadata : Prisma.DbNull,
        },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao registrar log de auditoria: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Consulta registros de auditoria com paginação e filtros opcionais.
   */
  async findAll(query: FindAuditLogsDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.familyId) {
      where.familyId = query.familyId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.entityName) {
      where.entityName = {
        contains: query.entityName,
        mode: 'insensitive',
      };
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(`${query.startDate}T00:00:00.000Z`);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(`${query.endDate}T23:59:59.999Z`);
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Busca um log de auditoria específico pelo ID.
   */
  async findById(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Log de auditoria com ID ${id} não encontrado`);
    }

    return log;
  }
}
