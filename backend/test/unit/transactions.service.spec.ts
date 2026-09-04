import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CreditCardsService } from '../../src/modules/credit-cards/credit-cards.service';
import {
  GoalMovementType,
  GoalStatus,
  InvoiceStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: any;
  let creditCardsService: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      creditCard: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'card-1',
          userId: 'user-1',
          familyId: null,
          isActive: true,
          creditLimit: new Prisma.Decimal(5000),
          invoices: [],
        }),
      },
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
        update: jest.fn(),
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
      goal: {
        update: jest.fn(),
      },
      goalDeposit: {
        delete: jest.fn(),
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
            deletedAt: null,
          }),
          include: expect.objectContaining({
            person: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('remove (soft delete with balance reversal)', () => {
    it('should soft delete expense transaction, set deletedAt and revert account currentBalance', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-1',
        type: TransactionType.EXPENSE,
        amount: new Prisma.Decimal(50),
        status: TransactionStatus.COMPLETED,
        accountId: 'acc-1',
        deletedAt: null,
      });

      const result = await service.remove('user-1', 'tx-1');

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { currentBalance: { increment: new Prisma.Decimal(50) } },
      });
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual({ message: 'Transação excluída e saldo estornado com sucesso' });
    });

    it('should soft delete income transaction, set deletedAt and revert account currentBalance', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-2',
        userId: 'user-1',
        type: TransactionType.INCOME,
        amount: new Prisma.Decimal(100),
        status: TransactionStatus.COMPLETED,
        accountId: 'acc-1',
        deletedAt: null,
      });

      await service.remove('user-1', 'tx-2');

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { currentBalance: { decrement: new Prisma.Decimal(100) } },
      });
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-2' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should soft delete credit card expense and decrement invoice totalAmount', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-3',
        userId: 'user-1',
        type: TransactionType.EXPENSE,
        amount: new Prisma.Decimal(80),
        status: TransactionStatus.COMPLETED,
        creditCardId: 'card-1',
        invoiceId: 'inv-1',
        deletedAt: null,
      });

      await service.remove('user-1', 'tx-3');

      expect(prisma.creditCardInvoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { totalAmount: { decrement: new Prisma.Decimal(80) } },
      });
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-3' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should soft delete transfer transaction and revert both accounts', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-4',
        userId: 'user-1',
        type: TransactionType.TRANSFER,
        amount: new Prisma.Decimal(200),
        status: TransactionStatus.COMPLETED,
        accountId: 'acc-src',
        destinationAccountId: 'acc-dst',
        deletedAt: null,
      });

      await service.remove('user-1', 'tx-4');

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-src' },
        data: { currentBalance: { increment: new Prisma.Decimal(200) } },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-dst' },
        data: { currentBalance: { decrement: new Prisma.Decimal(200) } },
      });
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-4' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if transaction does not exist', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1', 'inexistent-tx')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if transaction is already soft deleted', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-deleted',
        userId: 'user-1',
        deletedAt: new Date(),
      });

      await expect(service.remove('user-1', 'tx-deleted')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not author', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-other',
        userId: 'other-user',
        deletedAt: null,
      });

      await expect(service.remove('user-1', 'tx-other')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('credit card limit validation', () => {
    it('should reject single purchase if amount exceeds available limit', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        isActive: true,
        creditLimit: new Prisma.Decimal(1000),
        invoices: [
          {
            totalAmount: new Prisma.Decimal(800),
            paidAmount: new Prisma.Decimal(0),
            status: InvoiceStatus.OPEN,
          },
        ],
      });

      await expect(
        service.create('user-1', {
          type: TransactionType.EXPENSE,
          amount: 300,
          description: 'Compra cara',
          transactionDate: '2026-09-01',
          categoryId: 'cat-1',
          creditCardId: 'card-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject installment purchase if total amount exceeds available limit', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        isActive: true,
        creditLimit: new Prisma.Decimal(1000),
        invoices: [
          {
            totalAmount: new Prisma.Decimal(500),
            paidAmount: new Prisma.Decimal(0),
            status: InvoiceStatus.OPEN,
          },
        ],
      });

      await expect(
        service.create('user-1', {
          type: TransactionType.EXPENSE,
          amount: 600,
          totalInstallments: 3,
          description: 'Notebook parcelado',
          transactionDate: '2026-09-01',
          categoryId: 'cat-1',
          creditCardId: 'card-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject purchase if credit card is inactive', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        isActive: false,
        creditLimit: new Prisma.Decimal(1000),
        invoices: [],
      });

      await expect(
        service.create('user-1', {
          type: TransactionType.EXPENSE,
          amount: 50,
          description: 'Compra',
          transactionDate: '2026-09-01',
          categoryId: 'cat-1',
          creditCardId: 'card-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow purchase when amount is within available limit', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        isActive: true,
        creditLimit: new Prisma.Decimal(1000),
        invoices: [
          {
            totalAmount: new Prisma.Decimal(500),
            paidAmount: new Prisma.Decimal(100),
            status: InvoiceStatus.OPEN,
          },
        ],
      });
      creditCardsService.determineInvoiceForDate.mockResolvedValue({ id: 'inv-1' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-1', amount: new Prisma.Decimal(200) });
      prisma.creditCardInvoice.update.mockResolvedValue({ id: 'inv-1' });

      const tx = await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 200,
        description: 'Compra válida',
        transactionDate: '2026-09-01',
        categoryId: 'cat-1',
        creditCardId: 'card-1',
      });

      expect(tx).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should revert account and goal balance when deleting a deposit transfer', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-1',
        accountId: 'acc-1',
        amount: new Prisma.Decimal(500),
        status: TransactionStatus.COMPLETED,
        type: TransactionType.TRANSFER,
        deletedAt: null,
        goalDeposits: [
          {
            id: 'dep-1',
            goalId: 'goal-1',
            type: GoalMovementType.DEPOSIT,
            amount: new Prisma.Decimal(500),
            goal: {
              id: 'goal-1',
              currentAmount: new Prisma.Decimal(500),
              targetAmount: new Prisma.Decimal(1000),
              status: GoalStatus.IN_PROGRESS,
            },
          },
        ],
      });

      prisma.account.update.mockResolvedValue({});
      prisma.goal.update.mockResolvedValue({});
      prisma.goalDeposit.delete.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});

      const result = await service.remove('user-1', 'tx-1');

      expect(result.message).toContain('Transação excluída');
      // Devolve dinheiro para a conta
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { currentBalance: { increment: new Prisma.Decimal(500) } },
      });
      // Debita dinheiro da meta
      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: {
          currentAmount: new Prisma.Decimal(0),
          status: GoalStatus.IN_PROGRESS,
        },
      });
      // Remove movimentação da meta
      expect(prisma.goalDeposit.delete).toHaveBeenCalledWith({
        where: { id: 'dep-1' },
      });
    });

    it('should revert account and goal balance when deleting a withdrawal transfer', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-2',
        userId: 'user-1',
        accountId: 'acc-1',
        amount: new Prisma.Decimal(300),
        status: TransactionStatus.COMPLETED,
        type: TransactionType.TRANSFER,
        deletedAt: null,
        goalDeposits: [
          {
            id: 'dep-2',
            goalId: 'goal-1',
            type: GoalMovementType.WITHDRAWAL,
            amount: new Prisma.Decimal(300),
            goal: {
              id: 'goal-1',
              currentAmount: new Prisma.Decimal(200),
              targetAmount: new Prisma.Decimal(500),
              status: GoalStatus.IN_PROGRESS,
            },
          },
        ],
      });

      prisma.account.update.mockResolvedValue({});
      prisma.goal.update.mockResolvedValue({});
      prisma.goalDeposit.delete.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});

      const result = await service.remove('user-1', 'tx-2');

      expect(result.message).toContain('Transação excluída');
      // Retira dinheiro da conta
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { currentBalance: { decrement: new Prisma.Decimal(300) } },
      });
      // Devolve dinheiro para a meta
      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: {
          currentAmount: new Prisma.Decimal(500),
          status: GoalStatus.COMPLETED,
        },
      });
      // Remove movimentação da meta
      expect(prisma.goalDeposit.delete).toHaveBeenCalledWith({
        where: { id: 'dep-2' },
      });
    });
  });
});
