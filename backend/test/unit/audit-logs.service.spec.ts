import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '../../src/modules/audit-logs/audit-logs.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditAction } from '@prisma/client';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prisma: any;

  const mockAuditLog = {
    id: 'log-uuid-1',
    userId: 'user-uuid-1',
    familyId: 'family-uuid-1',
    entityName: 'Transaction',
    entityId: 'tx-uuid-1',
    action: AuditAction.CREATE,
    method: 'POST',
    endpoint: '/transactions',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    statusCode: 201,
    durationMs: 45,
    oldData: null,
    newData: { amount: 100, description: 'Supermercado' },
    metadata: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue(mockAuditLog),
        findMany: jest.fn().mockResolvedValue([mockAuditLog]),
        findUnique: jest.fn().mockResolvedValue(mockAuditLog),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  describe('createLog', () => {
    it('deve persistir log de auditoria com sucesso', async () => {
      const input = {
        userId: 'user-uuid-1',
        familyId: 'family-uuid-1',
        entityName: 'Transaction',
        entityId: 'tx-uuid-1',
        action: AuditAction.CREATE,
        method: 'POST',
        endpoint: '/transactions',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest',
        statusCode: 201,
        durationMs: 30,
        newData: { amount: 50 },
      };

      await service.createLog(input);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-uuid-1',
          familyId: 'family-uuid-1',
          method: 'POST',
          endpoint: '/transactions',
          statusCode: 201,
        }),
      });
    });

    it('deve capturar erro e não lançar exceção em caso de falha no banco de dados (resiliência)', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('Falha de conexão com PostgreSQL'));

      await expect(
        service.createLog({
          method: 'DELETE',
          endpoint: '/accounts/123',
          statusCode: 200,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de logs com metadados', async () => {
      const result = await service.findAll({
        page: 1,
        limit: 10,
        familyId: 'family-uuid-1',
      });

      expect(result).toEqual({
        data: [mockAuditLog],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: 'family-uuid-1',
          }),
          take: 10,
          skip: 0,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('deve aplicar filtros de período, entidade e ação', async () => {
      await service.findAll({
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        entityName: 'Transaction',
        action: AuditAction.UPDATE,
        userId: 'user-uuid-1',
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-uuid-1',
            entityName: { contains: 'Transaction', mode: 'insensitive' },
            action: AuditAction.UPDATE,
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar o log quando encontrado', async () => {
      const result = await service.findById('log-uuid-1');

      expect(result).toEqual(mockAuditLog);
      expect(prisma.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: 'log-uuid-1' },
      });
    });

    it('deve lançar NotFoundException quando o log não for encontrado', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
