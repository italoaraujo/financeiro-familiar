import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AuditLogsController } from '../../src/modules/audit-logs/audit-logs.controller';
import { AuditLogsService } from '../../src/modules/audit-logs/audit-logs.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { FamilyMemberRole, AuditAction } from '@prisma/client';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let auditLogsService: any;
  let prisma: any;

  const mockLog = {
    id: 'log-1',
    userId: 'user-admin',
    familyId: 'family-1',
    action: AuditAction.CREATE,
    method: 'POST',
    endpoint: '/transactions',
    statusCode: 201,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    auditLogsService = {
      findAll: jest.fn().mockResolvedValue({
        data: [mockLog],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
      findById: jest.fn().mockResolvedValue(mockLog),
    };

    prisma = {
      familyMember: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
  });

  describe('findAll', () => {
    it('deve permitir acesso aos logs da família quando o usuário for OWNER', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        role: FamilyMemberRole.OWNER,
      });

      const result = await controller.findAll('user-owner', { familyId: 'family-1' });

      expect(result.data).toHaveLength(1);
      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: 'family-1' }),
      );
    });

    it('deve permitir acesso aos logs da família quando o usuário for ADMIN', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        role: FamilyMemberRole.ADMIN,
      });

      const result = await controller.findAll('user-admin', { familyId: 'family-1' });

      expect(result.data).toHaveLength(1);
      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: 'family-1' }),
      );
    });

    it('deve lançar ForbiddenException se o usuário for apenas MEMBER da família', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        role: FamilyMemberRole.MEMBER,
      });

      await expect(
        controller.findAll('user-member', { familyId: 'family-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar ForbiddenException se o usuário não for membro da família', async () => {
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        controller.findAll('user-stranger', { familyId: 'family-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve filtrar estritamente pelo próprio userId quando familyId não for informado', async () => {
      await controller.findAll('user-normal', {});

      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-normal' }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar o log quando o usuário for OWNER/ADMIN da família vinculada', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        role: FamilyMemberRole.ADMIN,
      });

      const result = await controller.findById('user-admin', 'log-1');

      expect(result).toEqual(mockLog);
      expect(auditLogsService.findById).toHaveBeenCalledWith('log-1');
    });

    it('deve retornar o log pessoal quando o log for do próprio usuário', async () => {
      const personalLog = { ...mockLog, familyId: null, userId: 'user-normal' };
      auditLogsService.findById.mockResolvedValue(personalLog);

      const result = await controller.findById('user-normal', 'log-1');

      expect(result).toEqual(personalLog);
    });

    it('deve lançar ForbiddenException ao tentar consultar log de outro usuário sem permissão', async () => {
      const otherUserLog = { ...mockLog, familyId: null, userId: 'other-user' };
      auditLogsService.findById.mockResolvedValue(otherUserLog);

      await expect(
        controller.findById('user-unauthorized', 'log-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
