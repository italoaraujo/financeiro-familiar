import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from '../../src/modules/accounts/accounts.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AccountType, Prisma } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

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

  describe('findAll and findById', () => {
    it('should filter accounts by deletedAt: null in findAll', async () => {
      prisma.account.findMany.mockResolvedValue([]);

      await service.findAll('user-1');

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            deletedAt: null,
          }),
        }),
      );
    });

    it('should throw NotFoundException in findById if account has deletedAt', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-del',
        userId: 'user-1',
        deletedAt: new Date(),
      });

      await expect(service.findById('user-1', 'acc-del')).rejects.toThrow(NotFoundException);
    });
  });
});
