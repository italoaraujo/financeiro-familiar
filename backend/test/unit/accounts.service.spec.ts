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

  describe('remove', () => {
    it('should reject deletion if account has transactions', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', userId: 'user-1' });
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1' });

      await expect(service.remove('user-1', 'acc-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete account if no transactions exist', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', userId: 'user-1' });
      prisma.transaction.findFirst.mockResolvedValue(null);
      prisma.account.delete.mockResolvedValue({ id: 'acc-1' });

      const result = await service.remove('user-1', 'acc-1');
      expect(result.message).toContain('removida com sucesso');
    });
  });
});
