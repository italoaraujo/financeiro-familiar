import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from '../../src/modules/accounts/accounts.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AccountType, Prisma } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      account: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: {
        findFirst: jest.fn(),
      },
      familyMember: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  describe('create', () => {
    it('should create an account setting currentBalance equal to initialBalance', async () => {
      prisma.account.create.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Nubank',
        type: AccountType.CHECKING,
        initialBalance: new Prisma.Decimal(500),
        currentBalance: new Prisma.Decimal(500),
      });

      const result = await service.create('user-1', {
        name: 'Nubank',
        type: AccountType.CHECKING,
        initialBalance: 500,
      });

      expect(result.id).toBe('acc-1');
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'Nubank',
          initialBalance: new Prisma.Decimal(500),
          currentBalance: new Prisma.Decimal(500),
        }),
      });
    });
  });

  describe('remove (soft delete)', () => {
    it('should reject deletion if account has active transactions (deletedAt: null)', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', userId: 'user-1', deletedAt: null });
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1' });

      await expect(service.remove('user-1', 'acc-1')).rejects.toThrow(BadRequestException);
      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ accountId: 'acc-1' }, { destinationAccountId: 'acc-1' }],
          deletedAt: null,
        },
      });
    });

    it('should soft delete account if no active transactions exist', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', userId: 'user-1', deletedAt: null });
      prisma.transaction.findFirst.mockResolvedValue(null);
      prisma.account.update.mockResolvedValue({ id: 'acc-1', deletedAt: new Date(), isActive: false });

      const result = await service.remove('user-1', 'acc-1');
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { deletedAt: expect.any(Date), isActive: false },
      });
      expect(result.message).toContain('removida com sucesso');
    });

    it('should throw NotFoundException if account is already soft deleted', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', userId: 'user-1', deletedAt: new Date() });

      await expect(service.remove('user-1', 'acc-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('RBAC VIEWER permissions', () => {
    it('should throw ForbiddenException when VIEWER tries to create family account', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(
        service.create('user-viewer', {
          name: 'Conta Família',
          type: AccountType.CHECKING,
          familyId: 'family-1',
        }),
      ).rejects.toThrow(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    });

    it('should throw ForbiddenException when VIEWER tries to update family account', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        name: 'Conta Família',
        type: AccountType.CHECKING,
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(
        service.update('user-viewer', 'acc-fam-1', {
          name: 'Nome Alterado',
        }),
      ).rejects.toThrow(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    });

    it('should allow VIEWER to query family accounts via findAll', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });
      prisma.account.findMany.mockResolvedValue([
        { id: 'acc-fam-1', name: 'Conta Família', familyId: 'family-1' },
      ]);

      const result = await service.findAll('user-viewer', 'family-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findAll (archived filter)', () => {
    it('should filter only active accounts in personal scope by default', async () => {
      const activeAccounts = [{ id: 'acc-1', name: 'Nubank', isArchived: false }];
      prisma.account.findMany.mockResolvedValue(activeAccounts);

      const result = await service.findAll('user-1');

      expect(result).toEqual(activeAccounts);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          familyId: null,
          isArchived: false,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter only active accounts in family scope when includeArchived is false', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      const familyActive = [{ id: 'acc-fam-1', name: 'Itaú', isArchived: false }];
      prisma.account.findMany.mockResolvedValue(familyActive);

      const result = await service.findAll('user-1', 'family-1', false);

      expect(result).toEqual(familyActive);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-1',
          isArchived: false,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include archived accounts in personal scope when includeArchived is true', async () => {
      const allAccounts = [
        { id: 'acc-1', name: 'Nubank', isArchived: false },
        { id: 'acc-2', name: 'Antiga', isArchived: true },
      ];
      prisma.account.findMany.mockResolvedValue(allAccounts);

      const result = await service.findAll('user-1', undefined, true);

      expect(result).toEqual(allAccounts);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          familyId: null,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include archived accounts in family scope when includeArchived is true', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        familyId: 'family-1',
        role: 'VIEWER',
      });
      const allFamilyAccounts = [
        { id: 'acc-fam-1', name: 'Itaú', isArchived: false },
        { id: 'acc-fam-2', name: 'Bradesco', isArchived: true },
      ];
      prisma.account.findMany.mockResolvedValue(allFamilyAccounts);

      const result = await service.findAll('user-1', 'family-1', true);

      expect(result).toEqual(allFamilyAccounts);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-1',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('archive', () => {
    it('should archive account by setting isArchived true and isActive false', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        familyId: null,
        isArchived: false,
        isActive: true,
        deletedAt: null,
      });
      const updated = { id: 'acc-1', isArchived: true, isActive: false };
      prisma.account.update.mockResolvedValue(updated);

      const result = await service.archive('user-1', 'acc-1');

      expect(result).toEqual(updated);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { isArchived: true, isActive: false },
      });
    });

    it('should throw ForbiddenException when VIEWER tries to archive family account', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isArchived: false,
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(service.archive('user-viewer', 'acc-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );
      expect(prisma.account.update).not.toHaveBeenCalled();
    });
  });

  describe('unarchive', () => {
    it('should unarchive an archived personal account setting isArchived false and isActive true', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        familyId: null,
        isArchived: true,
        isActive: false,
        deletedAt: null,
      });
      const reactivated = { id: 'acc-1', isArchived: false, isActive: true };
      prisma.account.update.mockResolvedValue(reactivated);

      const result = await service.unarchive('user-1', 'acc-1');

      expect(result).toEqual(reactivated);
      expect(result.isArchived).toBe(false);
      expect(result.isActive).toBe(true);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { isArchived: false, isActive: true },
      });
    });

    it('should unarchive an archived family account when user is MEMBER or ADMIN', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isArchived: true,
        isActive: false,
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-member',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      const reactivated = { id: 'acc-fam-1', isArchived: false, isActive: true };
      prisma.account.update.mockResolvedValue(reactivated);

      const result = await service.unarchive('user-member', 'acc-fam-1');

      expect(result).toEqual(reactivated);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-fam-1' },
        data: { isArchived: false, isActive: true },
      });
    });

    it('should throw BadRequestException if account is already active (not archived)', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        familyId: null,
        isArchived: false,
        isActive: true,
        deletedAt: null,
      });

      await expect(service.unarchive('user-1', 'acc-1')).rejects.toThrow(
        new BadRequestException('A conta não está arquivada'),
      );
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if account does not exist or is soft deleted', async () => {
      prisma.account.findUnique.mockResolvedValueOnce(null);
      await expect(service.unarchive('user-1', 'acc-missing')).rejects.toThrow(
        NotFoundException,
      );

      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-deleted',
        userId: 'user-1',
        isArchived: true,
        deletedAt: new Date(),
      });
      await expect(service.unarchive('user-1', 'acc-deleted')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when VIEWER or unauthorized user tries to unarchive', async () => {
      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isArchived: true,
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(service.unarchive('user-viewer', 'acc-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );

      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-other',
        userId: 'user-owner',
        familyId: null,
        isArchived: true,
        deletedAt: null,
      });

      await expect(service.unarchive('user-intruder', 'acc-other')).rejects.toThrow(
        new ForbiddenException('Acesso negado à conta especificada'),
      );
      expect(prisma.account.update).not.toHaveBeenCalled();
    });
  });
});
