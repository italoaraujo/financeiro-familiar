import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CreditCardsService } from '../../src/modules/credit-cards/credit-cards.service';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: any;
  let creditCardsService: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      account: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      creditCardInvoice: {
        update: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      familyMember: {
        findUnique: jest.fn(),
      },
      person: {
        findUnique: jest.fn(),
      },
    };

    creditCardsService = {
      determineInvoiceForDate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CreditCardsService, useValue: creditCardsService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('create expense in account', () => {
    it('should create expense and decrement currentBalance of account', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        currentBalance: new Prisma.Decimal(1000),
      });

      prisma.transaction.create.mockResolvedValue({
        id: 'tx-1',
        amount: new Prisma.Decimal(150),
        status: TransactionStatus.COMPLETED,
        type: TransactionType.EXPENSE,
      });

      await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 150,
        description: 'Supermercado',
        transactionDate: '2026-09-01',
        categoryId: 'cat-1',
        accountId: 'acc-1',
      });

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: {
          currentBalance: {
            increment: new Prisma.Decimal(-150),
          },
        },
      });
    });
  });

  describe('transfer', () => {
    it('should reject transfer if source and destination are the same', async () => {
      await expect(
        service.transfer('user-1', {
          sourceAccountId: 'acc-1',
          destinationAccountId: 'acc-1',
          amount: 100,
          description: 'Transfer',
          transactionDate: '2026-09-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should debit source and credit destination in atomic transaction', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce({ id: 'acc-src' })
        .mockResolvedValueOnce({ id: 'acc-dst' });

      prisma.category.findFirst.mockResolvedValue({ id: 'cat-transf' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-transf' });

      await service.transfer('user-1', {
        sourceAccountId: 'acc-src',
        destinationAccountId: 'acc-dst',
        amount: 300,
        description: 'Aporte poupança',
        transactionDate: '2026-09-01',
      });

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-src' },
        data: { currentBalance: { decrement: new Prisma.Decimal(300) } },
      });

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-dst' },
        data: { currentBalance: { increment: new Prisma.Decimal(300) } },
      });
    });
  });

  describe('installment purchases on card', () => {
    it('should create N installments across invoices with exact cent rounding', async () => {
      creditCardsService.determineInvoiceForDate.mockResolvedValue({ id: 'inv-month' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-inst-1' });

      await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 100,
        totalInstallments: 3,
        description: 'Notebook',
        transactionDate: '2026-09-01',
        categoryId: 'cat-eletronicos',
        creditCardId: 'card-1',
      });

      expect(prisma.transaction.create).toHaveBeenCalledTimes(3);
      expect(prisma.creditCardInvoice.update).toHaveBeenCalledTimes(3);
    });

    it('should assign personId and propagate to all installments', async () => {
      creditCardsService.determineInvoiceForDate.mockResolvedValue({ id: 'inv-month' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-inst-1' });
      prisma.person.findUnique.mockResolvedValue({ id: 'person-child', familyId: 'fam-1' });
      prisma.familyMember.findUnique.mockResolvedValue({ role: 'MEMBER' });

      await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 300,
        totalInstallments: 3,
        description: 'Tênis Pedro',
        transactionDate: '2026-09-01',
        categoryId: 'cat-vestuario',
        creditCardId: 'card-1',
        familyId: 'fam-1',
        personId: 'person-child',
      });

      expect(prisma.transaction.create).toHaveBeenCalledTimes(3);
      expect(prisma.transaction.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            personId: 'person-child',
            installmentNumber: 1,
          }),
        }),
      );
      expect(prisma.transaction.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: expect.objectContaining({
            personId: 'person-child',
            installmentNumber: 3,
          }),
        }),
      );
    });
  });

  describe('findAll with personId filter', () => {
    it('should filter transactions by personId and return person data', async () => {
      prisma.transaction.count.mockResolvedValue(1);
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          description: 'Lanche',
          amount: new Prisma.Decimal(25),
          personId: 'person-child',
          person: { id: 'person-child', name: 'Pedro', color: '#3b82f6' },
        },
      ]);

      const result = await service.findAll('user-1', {
        personId: 'person-child',
      });

      expect(result.data).toHaveLength(1);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            personId: 'person-child',
          }),
          include: expect.objectContaining({
            person: expect.anything(),
          }),
        }),
      );
    });
  });
});
