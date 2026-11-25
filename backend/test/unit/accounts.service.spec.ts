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
      $transaction: jest.fn((cb) => cb(prisma)),
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
      userFavoriteAccount: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
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

      expect(result).toEqual(activeAccounts.map((acc) => ({ ...acc, isFavorite: false })));
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

      expect(result).toEqual(familyActive.map((acc) => ({ ...acc, isFavorite: false })));
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

      expect(result).toEqual(allAccounts.map((acc) => ({ ...acc, isFavorite: false })));
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

      expect(result).toEqual(allFamilyAccounts.map((acc) => ({ ...acc, isFavorite: false })));
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

      expect(result).toEqual({ ...updated, isFavorite: false });
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

      expect(result).toEqual({ ...reactivated, isFavorite: false });
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

      expect(result).toEqual({ ...reactivated, isFavorite: false });
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

  describe('favorite', () => {
    it('should favorite an active personal account and return isFavorite: true', async () => {
      const account = {
        id: 'acc-1',
        userId: 'user-1',
        familyId: null,
        name: 'Nubank',
        isArchived: false,
        deletedAt: null,
      };
      prisma.account.findUnique.mockResolvedValue(account);
      prisma.userFavoriteAccount.upsert.mockResolvedValue({
        userId: 'user-1',
        accountId: 'acc-1',
      });

      const result = await service.favorite('user-1', 'acc-1');

      expect(prisma.userFavoriteAccount.upsert).toHaveBeenCalledWith({
        where: { userId_accountId: { userId: 'user-1', accountId: 'acc-1' } },
        create: { userId: 'user-1', accountId: 'acc-1' },
        update: {},
      });
      expect(result).toEqual({ ...account, isFavorite: true });
    });

    it('should favorite an active family account when user has write access', async () => {
      const account = {
        id: 'acc-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        name: 'Conta Conjunta',
        isArchived: false,
        deletedAt: null,
      };
      prisma.account.findUnique.mockResolvedValue(account);
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-2',
        userId: 'user-member',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      prisma.userFavoriteAccount.upsert.mockResolvedValue({
        userId: 'user-member',
        accountId: 'acc-fam-1',
      });

      const result = await service.favorite('user-member', 'acc-fam-1');

      expect(prisma.userFavoriteAccount.upsert).toHaveBeenCalledWith({
        where: { userId_accountId: { userId: 'user-member', accountId: 'acc-fam-1' } },
        create: { userId: 'user-member', accountId: 'acc-fam-1' },
        update: {},
      });
      expect(result).toEqual({ ...account, isFavorite: true });
    });

    it('should handle repeated favorite idempotently via upsert without duplicate error', async () => {
      const account = {
        id: 'acc-1',
        userId: 'user-1',
        familyId: null,
        name: 'Nubank',
        isArchived: false,
        deletedAt: null,
      };
      prisma.account.findUnique.mockResolvedValue(account);
      prisma.userFavoriteAccount.findUnique.mockResolvedValue({
        userId: 'user-1',
        accountId: 'acc-1',
      });
      prisma.userFavoriteAccount.upsert.mockResolvedValue({
        userId: 'user-1',
        accountId: 'acc-1',
      });

      const first = await service.favorite('user-1', 'acc-1');
      const second = await service.favorite('user-1', 'acc-1');

      expect(first).toEqual({ ...account, isFavorite: true });
      expect(second).toEqual({ ...account, isFavorite: true });
      expect(prisma.userFavoriteAccount.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.userFavoriteAccount.upsert).toHaveBeenCalledWith({
        where: { userId_accountId: { userId: 'user-1', accountId: 'acc-1' } },
        create: { userId: 'user-1', accountId: 'acc-1' },
        update: {},
      });
    });

    it('should throw BadRequestException with exact message when favoriting an archived account', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-arch',
        userId: 'user-1',
        familyId: null,
        isArchived: true,
        deletedAt: null,
      });

      await expect(service.favorite('user-1', 'acc-arch')).rejects.toThrow(
        new BadRequestException('Não é possível favoritar uma conta arquivada'),
      );
      expect(prisma.userFavoriteAccount.upsert).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when favoriting a missing or soft-deleted account', async () => {
      prisma.account.findUnique.mockResolvedValueOnce(null);
      await expect(service.favorite('user-1', 'acc-missing')).rejects.toThrow(
        NotFoundException,
      );

      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-deleted',
        userId: 'user-1',
        familyId: null,
        isArchived: false,
        deletedAt: new Date(),
      });
      await expect(service.favorite('user-1', 'acc-deleted')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.userFavoriteAccount.upsert).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when VIEWER or unauthorized user tries to favorite', async () => {
      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isArchived: false,
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-viewer',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(service.favorite('user-viewer', 'acc-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );

      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-other',
        userId: 'user-owner',
        familyId: null,
        isArchived: false,
        deletedAt: null,
      });

      await expect(service.favorite('user-intruder', 'acc-other')).rejects.toThrow(
        new ForbiddenException('Acesso negado à conta especificada'),
      );
      expect(prisma.userFavoriteAccount.upsert).not.toHaveBeenCalled();
    });
  });

  describe('unfavorite', () => {
    it('should remove only the caller favorite link and return isFavorite: false', async () => {
      const account = {
        id: 'acc-1',
        userId: 'user-1',
        familyId: null,
        name: 'Nubank',
        isArchived: false,
        deletedAt: null,
      };
      prisma.account.findUnique.mockResolvedValue(account);
      prisma.userFavoriteAccount.findUnique.mockResolvedValue({
        userId: 'user-1',
        accountId: 'acc-1',
      });
      prisma.userFavoriteAccount.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unfavorite('user-1', 'acc-1');

      expect(prisma.userFavoriteAccount.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', accountId: 'acc-1' },
      });
      expect(result).toEqual({ ...account, isFavorite: false });
    });

    it('should unfavorite idempotently when account was not favorited', async () => {
      const account = {
        id: 'acc-1',
        userId: 'user-1',
        familyId: null,
        name: 'Nubank',
        isArchived: false,
        deletedAt: null,
      };
      prisma.account.findUnique.mockResolvedValue(account);
      prisma.userFavoriteAccount.findUnique.mockResolvedValue(null);
      prisma.userFavoriteAccount.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.unfavorite('user-1', 'acc-1');

      expect(prisma.userFavoriteAccount.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', accountId: 'acc-1' },
      });
      expect(result).toEqual({ ...account, isFavorite: false });
    });

    it('should throw NotFoundException when unfavoriting a missing or soft-deleted account', async () => {
      prisma.account.findUnique.mockResolvedValueOnce(null);
      await expect(service.unfavorite('user-1', 'acc-missing')).rejects.toThrow(
        NotFoundException,
      );

      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-deleted',
        userId: 'user-1',
        familyId: null,
        isArchived: false,
        deletedAt: new Date(),
      });
      await expect(service.unfavorite('user-1', 'acc-deleted')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.userFavoriteAccount.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when VIEWER or unauthorized user tries to unfavorite', async () => {
      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isArchived: false,
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-viewer',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(service.unfavorite('user-viewer', 'acc-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );

      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-other',
        userId: 'user-owner',
        familyId: null,
        isArchived: false,
        deletedAt: null,
      });

      await expect(service.unfavorite('user-intruder', 'acc-other')).rejects.toThrow(
        new ForbiddenException('Acesso negado à conta especificada'),
      );
      expect(prisma.userFavoriteAccount.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('favorites ordering and isolation', () => {
    it('should sort multiple favorite accounts first using isFavorite DESC, createdAt DESC', async () => {
      const accNewNonFav = {
        id: 'acc-4',
        name: 'Mais Nova Não Favorita',
        createdAt: new Date('2026-04-01T10:00:00Z'),
      };
      const accNewFav = {
        id: 'acc-3',
        name: 'Favorita Mais Nova',
        createdAt: new Date('2026-03-01T10:00:00Z'),
      };
      const accOldNonFav = {
        id: 'acc-2',
        name: 'Antiga Não Favorita',
        createdAt: new Date('2026-02-01T10:00:00Z'),
      };
      const accOldFav = {
        id: 'acc-1',
        name: 'Favorita Antiga',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      };

      prisma.account.findMany.mockResolvedValue([
        accNewNonFav,
        accNewFav,
        accOldNonFav,
        accOldFav,
      ]);
      prisma.userFavoriteAccount.findMany.mockResolvedValue([
        { accountId: 'acc-1' },
        { accountId: 'acc-3' },
      ]);

      const result = await service.findAll('user-1');

      expect(prisma.userFavoriteAccount.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          accountId: { in: ['acc-4', 'acc-3', 'acc-2', 'acc-1'] },
        },
        select: { accountId: true },
      });
      expect(result).toEqual([
        { ...accNewFav, isFavorite: true },
        { ...accOldFav, isFavorite: true },
        { ...accNewNonFav, isFavorite: false },
        { ...accOldNonFav, isFavorite: false },
      ]);
    });

    it('should isolate family account favorites per user in findAll', async () => {
      const famAccNew = {
        id: 'acc-fam-2',
        name: 'Bradesco Família',
        familyId: 'family-1',
        createdAt: new Date('2026-03-01T10:00:00Z'),
      };
      const famAccOld = {
        id: 'acc-fam-1',
        name: 'Itaú Família',
        familyId: 'family-1',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      };

      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      prisma.account.findMany.mockResolvedValue([famAccNew, famAccOld]);
      prisma.userFavoriteAccount.findMany
        .mockResolvedValueOnce([{ accountId: 'acc-fam-1' }])
        .mockResolvedValueOnce([]);

      const resultUserA = await service.findAll('user-a', 'family-1');
      const resultUserB = await service.findAll('user-b', 'family-1');

      expect(prisma.userFavoriteAccount.findMany).toHaveBeenNthCalledWith(1, {
        where: { userId: 'user-a', accountId: { in: ['acc-fam-2', 'acc-fam-1'] } },
        select: { accountId: true },
      });
      expect(prisma.userFavoriteAccount.findMany).toHaveBeenNthCalledWith(2, {
        where: { userId: 'user-b', accountId: { in: ['acc-fam-2', 'acc-fam-1'] } },
        select: { accountId: true },
      });
      expect(resultUserA).toEqual([
        { ...famAccOld, isFavorite: true },
        { ...famAccNew, isFavorite: false },
      ]);
      expect(resultUserB).toEqual([
        { ...famAccNew, isFavorite: false },
        { ...famAccOld, isFavorite: false },
      ]);
    });

    it('should return isFavorite reflecting only caller state in findById', async () => {
      const account = {
        id: 'acc-fam-1',
        userId: 'user-a',
        familyId: 'family-1',
        name: 'Conta Família',
        deletedAt: null,
      };
      prisma.account.findUnique.mockResolvedValue(account);
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-b',
        userId: 'user-b',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      prisma.userFavoriteAccount.findUnique
        .mockResolvedValueOnce({ userId: 'user-a', accountId: 'acc-fam-1' })
        .mockResolvedValueOnce(null);

      const resA = await service.findById('user-a', 'acc-fam-1');
      const resB = await service.findById('user-b', 'acc-fam-1');

      expect(resA).toEqual({ ...account, isFavorite: true });
      expect(resB).toEqual({ ...account, isFavorite: false });
      expect(prisma.userFavoriteAccount.findUnique).toHaveBeenNthCalledWith(1, {
        where: { userId_accountId: { userId: 'user-a', accountId: 'acc-fam-1' } },
      });
      expect(prisma.userFavoriteAccount.findUnique).toHaveBeenNthCalledWith(2, {
        where: { userId_accountId: { userId: 'user-b', accountId: 'acc-fam-1' } },
      });
    });

    it('should return empty array without querying favorites when no accounts exist', async () => {
      prisma.account.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
      expect(prisma.userFavoriteAccount.findMany).not.toHaveBeenCalled();
    });
  });

  describe('favorites lifecycle on archive, unarchive, and remove', () => {
    it('should delete all favorite links for the account inside $transaction on archive and return isFavorite: false', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        familyId: null,
        isArchived: false,
        isActive: true,
        deletedAt: null,
      });
      const archived = { id: 'acc-1', isArchived: true, isActive: false };
      prisma.account.update.mockResolvedValue(archived);

      const result = await service.archive('user-1', 'acc-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.userFavoriteAccount.deleteMany).toHaveBeenCalledWith({
        where: { accountId: 'acc-1' },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { isArchived: true, isActive: false },
      });
      expect(result).toEqual({ ...archived, isFavorite: false });
    });

    it('should delete all favorite links for the account inside $transaction on remove', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        familyId: null,
        deletedAt: null,
      });
      prisma.transaction.findFirst.mockResolvedValue(null);
      prisma.account.update.mockResolvedValue({
        id: 'acc-1',
        deletedAt: new Date(),
        isActive: false,
      });

      const result = await service.remove('user-1', 'acc-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.userFavoriteAccount.deleteMany).toHaveBeenCalledWith({
        where: { accountId: 'acc-1' },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { deletedAt: expect.any(Date), isActive: false },
      });
      expect(result).toEqual({ message: 'Conta removida com sucesso' });
    });

    it('should return isFavorite: false after unarchiving a previously archived account', async () => {
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

      expect(result).toEqual({ ...reactivated, isFavorite: false });
    });
  });
});
