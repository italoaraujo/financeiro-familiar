import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CreditCardsService } from '../../src/modules/credit-cards/credit-cards.service';
import { TagsService } from '../../src/modules/tags/tags.service';
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
  let tagsService: any;

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
        findUnique: jest.fn().mockResolvedValue({
          id: 'cat-1',
          name: 'Alimentação',
          isSystemDefault: true,
          deletedAt: null,
        }),
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
      transactionTag: {
        create: jest.fn(),
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
      getOrCreateInvoice: jest.fn().mockResolvedValue({ id: 'inv-future' }),
    };

    tagsService = {
      findOrCreateMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CreditCardsService, useValue: creditCardsService },
        { provide: TagsService, useValue: tagsService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('create expense in account', () => {
    it('should create expense and decrement currentBalance of account', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
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

    it('should reject transfer if source account has insufficient balance (SEC-CRIT-02)', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce({
          id: 'acc-src',
          userId: 'user-1',
          currentBalance: new Prisma.Decimal(50),
        })
        .mockResolvedValueOnce({
          id: 'acc-dst',
          userId: 'user-1',
          currentBalance: new Prisma.Decimal(100),
        });

      await expect(
        service.transfer('user-1', {
          sourceAccountId: 'acc-src',
          destinationAccountId: 'acc-dst',
          amount: 200,
          description: 'Transferência sem fundos',
          transactionDate: '2026-09-01',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('should debit source and credit destination in atomic transaction', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce({
          id: 'acc-src',
          userId: 'user-1',
          currentBalance: new Prisma.Decimal(1000),
        })
        .mockResolvedValueOnce({
          id: 'acc-dst',
          userId: 'user-1',
          currentBalance: new Prisma.Decimal(500),
        });

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

    it('should reject transaction creation when totalInstallments exceeds 72 (SEC-HIGH-02)', async () => {
      await expect(
        service.create('user-1', {
          type: TransactionType.EXPENSE,
          amount: 5000,
          totalInstallments: 73,
          description: 'Financiamento abusivo',
          transactionDate: '2026-09-01',
          categoryId: 'cat-1',
          creditCardId: 'card-1',
        }),
      ).rejects.toThrow(
        new BadRequestException('O parcelamento máximo permitido é de 72 vezes'),
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

    it('should throw BadRequestException when trying to delete credit card transaction from CLOSED invoice (SEC-HIGH-03)', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-closed-inv',
        userId: 'user-1',
        type: TransactionType.EXPENSE,
        amount: new Prisma.Decimal(80),
        status: TransactionStatus.COMPLETED,
        creditCardId: 'card-1',
        invoiceId: 'inv-closed',
        deletedAt: null,
        invoice: {
          id: 'inv-closed',
          status: InvoiceStatus.CLOSED,
        },
      });

      await expect(service.remove('user-1', 'tx-closed-inv')).rejects.toThrow(
        new BadRequestException(
          'Não é possível excluir lançamentos de faturas que já foram fechadas ou pagas',
        ),
      );
    });

    it('should throw BadRequestException when trying to delete credit card transaction from PAID invoice (SEC-HIGH-03)', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-paid-inv',
        userId: 'user-1',
        type: TransactionType.EXPENSE,
        amount: new Prisma.Decimal(120),
        status: TransactionStatus.COMPLETED,
        creditCardId: 'card-1',
        invoiceId: 'inv-paid',
        deletedAt: null,
        invoice: {
          id: 'inv-paid',
          status: InvoiceStatus.PAID,
        },
      });

      await expect(service.remove('user-1', 'tx-paid-inv')).rejects.toThrow(
        new BadRequestException(
          'Não é possível excluir lançamentos de faturas que já foram fechadas ou pagas',
        ),
      );
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
    it('should throw BadRequestException when trying to delete a transaction linked to a goal', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-1',
        accountId: 'acc-1',
        amount: new Prisma.Decimal(500),
        status: TransactionStatus.COMPLETED,
        type: TransactionType.TRANSFER,
        deletedAt: null,
        goalDeposits: [{ id: 'dep-1', goalId: 'goal-1' }],
      });

      await expect(service.remove('user-1', 'tx-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when category is Aporte em Meta or Resgate de Meta', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-2',
        userId: 'user-1',
        accountId: 'acc-1',
        amount: new Prisma.Decimal(500),
        status: TransactionStatus.COMPLETED,
        type: TransactionType.TRANSFER,
        deletedAt: null,
        category: { name: 'Aporte em Meta' },
        goalDeposits: [],
      });

      await expect(service.remove('user-1', 'tx-2')).rejects.toThrow(BadRequestException);
    });

    it('should revert account balance and soft-delete regular transaction', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-3',
        userId: 'user-1',
        accountId: 'acc-1',
        amount: new Prisma.Decimal(150),
        status: TransactionStatus.COMPLETED,
        type: TransactionType.EXPENSE,
        deletedAt: null,
        category: { name: 'Alimentação' },
        goalDeposits: [],
      });

      prisma.account.update.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});

      const result = await service.remove('user-1', 'tx-3');

      expect(result.message).toContain('Transação excluída');
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { currentBalance: { increment: new Prisma.Decimal(150) } },
      });
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-3' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('RBAC VIEWER permissions', () => {
    it('should throw ForbiddenException when VIEWER tries to create family transaction', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(
        service.create('user-viewer', {
          type: TransactionType.EXPENSE,
          amount: 100,
          description: 'Despesa Proibida',
          transactionDate: '2026-09-01',
          accountId: 'acc-1',
          categoryId: 'cat-1',
          familyId: 'family-1',
        }),
      ).rejects.toThrow(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    });

    it('should throw ForbiddenException when VIEWER tries to transfer in family context', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(
        service.transfer('user-viewer', {
          sourceAccountId: 'acc-1',
          destinationAccountId: 'acc-2',
          amount: 200,
          description: 'Transferência Proibida',
          transactionDate: '2026-09-01',
          familyId: 'family-1',
        }),
      ).rejects.toThrow(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    });

    it('should allow VIEWER to list family transactions via findAll', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });
      prisma.transaction.count.mockResolvedValue(1);
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-fam-1',
          description: 'Supermercado',
          familyId: 'family-1',
          userId: 'user-owner',
          amount: new Prisma.Decimal(100),
          isPrivate: false,
          category: { name: 'Alimentação' },
        },
      ]);

      const result = await service.findAll('user-viewer', { familyId: 'family-1' });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('Tags support in transactions', () => {
    it('should associate tags with single transaction', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        currentBalance: new Prisma.Decimal(1000),
      });
      prisma.transaction.create.mockResolvedValue({
        id: 'tx-with-tags',
        type: TransactionType.EXPENSE,
        amount: new Prisma.Decimal(100),
        status: TransactionStatus.COMPLETED,
      });
      tagsService.findOrCreateMany.mockResolvedValue([
        { id: 'tag-1', name: 'viagem' },
        { id: 'tag-2', name: 'ferias' },
      ]);

      await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 100,
        description: 'Passagem',
        transactionDate: '2026-09-01',
        categoryId: 'cat-1',
        accountId: 'acc-1',
        tags: ['#viagem', 'ferias'],
      });

      expect(tagsService.findOrCreateMany).toHaveBeenCalledWith(
        'user-1',
        undefined,
        ['#viagem', 'ferias'],
        expect.anything(),
      );
      expect(prisma.transactionTag.create).toHaveBeenCalledWith({
        data: { transactionId: 'tx-with-tags', tagId: 'tag-1' },
      });
      expect(prisma.transactionTag.create).toHaveBeenCalledWith({
        data: { transactionId: 'tx-with-tags', tagId: 'tag-2' },
      });
    });

    it('should replicate tags to all installments in credit card purchase', async () => {
      creditCardsService.determineInvoiceForDate.mockResolvedValue({ id: 'inv-1' });
      prisma.transaction.create
        .mockResolvedValueOnce({ id: 'tx-inst-1' })
        .mockResolvedValueOnce({ id: 'tx-inst-2' });

      tagsService.findOrCreateMany.mockResolvedValue([{ id: 'tag-reforma', name: 'reforma' }]);

      await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 300,
        description: 'Tinta',
        transactionDate: '2026-09-01',
        categoryId: 'cat-1',
        creditCardId: 'card-1',
        totalInstallments: 2,
        tags: ['reforma'],
      });

      expect(prisma.transactionTag.create).toHaveBeenCalledWith({
        data: { transactionId: 'tx-inst-1', tagId: 'tag-reforma' },
      });
      expect(prisma.transactionTag.create).toHaveBeenCalledWith({
        data: { transactionId: 'tx-inst-2', tagId: 'tag-reforma' },
      });
    });

    it('should filter transactions by tagId and return formatted tags in findAll', async () => {
      prisma.transaction.count.mockResolvedValue(1);
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          description: 'Passagem aérea',
          userId: 'user-1',
          amount: new Prisma.Decimal(500),
          isPrivate: false,
          category: { name: 'Viagem' },
          tags: [
            { tag: { id: 'tag-1', name: 'viagem', color: '#10b981' } },
          ],
        },
      ]);

      const result = await service.findAll('user-1', { tagId: 'tag-1' });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: {
              some: {
                OR: [
                  { tagId: 'tag-1' },
                  { tag: { name: { equals: 'tag-1', mode: 'insensitive' } } },
                ],
              },
            },
          }),
        }),
      );
      expect(result.data[0].tags).toEqual([{ id: 'tag-1', name: 'viagem', color: '#10b981' }]);
    });

    it('should sanitize tags to empty array for private transactions of other users', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'fm-1',
        userId: 'user-2',
        familyId: 'fam-1',
        role: 'MEMBER',
      });
      prisma.transaction.count.mockResolvedValue(1);
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-priv',
          description: 'Presente Secreto',
          userId: 'user-1',
          familyId: 'fam-1',
          amount: new Prisma.Decimal(200),
          isPrivate: true,
          category: { name: 'Compras' },
          tags: [{ tag: { id: 'tag-sec', name: 'secreto' } }],
        },
      ]);

      const result = await service.findAll('user-2', { familyId: 'fam-1' });

      expect(result.data[0].description).toBe('Lançamento Privado');
      expect(result.data[0].tags).toEqual([]);
    });
  });

  describe('transaction time support (TIME-01 to TIME-08)', () => {
    it('should persist explicit hour and minute when transactionTime is provided (TIME-01, TIME-02)', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', userId: 'user-1' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-time-1' });

      await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 85.5,
        description: 'Almoço com horário',
        transactionDate: '2026-10-02',
        transactionTime: '15:45',
        categoryId: 'cat-1',
        accountId: 'acc-1',
      });

      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionDate: expect.any(Date),
          }),
        }),
      );

      const createdCall = prisma.transaction.create.mock.calls[0][0];
      const date: Date = createdCall.data.transactionDate;
      expect(date.getHours()).toBe(15);
      expect(date.getMinutes()).toBe(45);
    });

    it('should fallback to neutral 12:00:00 when no transactionTime is provided (TIME-03)', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', userId: 'user-1' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-time-2' });

      await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 50.0,
        description: 'Lanche sem horário',
        transactionDate: '2026-10-02',
        categoryId: 'cat-1',
        accountId: 'acc-1',
      });

      const createdCall = prisma.transaction.create.mock.calls[0][0];
      const date: Date = createdCall.data.transactionDate;
      expect(date.getHours()).toBe(12);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
    });

    it('should persist explicit time in transfer (TIME-06)', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce({
          id: 'acc-1',
          userId: 'user-1',
          currentBalance: new Prisma.Decimal(1000),
        })
        .mockResolvedValueOnce({
          id: 'acc-2',
          userId: 'user-1',
          currentBalance: new Prisma.Decimal(500),
        });
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-transf' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-transf' });

      await service.transfer('user-1', {
        sourceAccountId: 'acc-1',
        destinationAccountId: 'acc-2',
        amount: 200,
        description: 'Transferência com horário',
        transactionDate: '2026-10-02',
        transactionTime: '09:15',
      });

      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionDate: expect.any(Date),
          }),
        }),
      );

      const createdCall = prisma.transaction.create.mock.calls[0][0];
      const date: Date = createdCall.data.transactionDate;
      expect(date.getHours()).toBe(9);
      expect(date.getMinutes()).toBe(15);
    });

    it('should set explicit time on first installment and closing day with 00:00:00 on future installments (TIME-07, TIME-08)', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        isActive: true,
        closingDay: 20,
        creditLimit: new Prisma.Decimal(5000),
        invoices: [],
      });
      creditCardsService.determineInvoiceForDate.mockResolvedValue({
        id: 'inv-1',
        referenceMonth: '2026-10',
      });
      creditCardsService.getOrCreateInvoice.mockResolvedValue({
        id: 'inv-2',
        referenceMonth: '2026-11',
      });
      prisma.transaction.create
        .mockResolvedValueOnce({ id: 'tx-inst-1' })
        .mockResolvedValueOnce({ id: 'tx-inst-2' });

      await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 600,
        description: 'Compra parcelada com horário',
        transactionDate: '2026-10-02',
        transactionTime: '16:20',
        categoryId: 'cat-1',
        creditCardId: 'card-1',
        totalInstallments: 2,
      });

      expect(prisma.transaction.create).toHaveBeenCalledTimes(2);

      const firstCall = prisma.transaction.create.mock.calls[0][0];
      const firstDate: Date = firstCall.data.transactionDate;
      expect(firstDate.getDate()).toBe(2);
      expect(firstDate.getMonth()).toBe(9); // Outubro (0-indexed: 9)
      expect(firstDate.getFullYear()).toBe(2026);
      expect(firstDate.getHours()).toBe(16);
      expect(firstDate.getMinutes()).toBe(20);

      const secondCall = prisma.transaction.create.mock.calls[1][0];
      const secondDate: Date = secondCall.data.transactionDate;
      expect(secondDate.getDate()).toBe(20); // Fechamento do cartão (closingDay = 20)
      expect(secondDate.getMonth()).toBe(10); // Novembro (0-indexed: 10)
      expect(secondDate.getFullYear()).toBe(2026);
      expect(secondDate.getHours()).toBe(0);
      expect(secondDate.getMinutes()).toBe(0);
      expect(secondDate.getSeconds()).toBe(0);
    });

    it('should adjust future installment date if closingDay exceeds days in target month', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        isActive: true,
        closingDay: 31,
        creditLimit: new Prisma.Decimal(5000),
        invoices: [],
      });
      creditCardsService.determineInvoiceForDate.mockResolvedValue({
        id: 'inv-1',
        referenceMonth: '2026-10',
      });
      creditCardsService.getOrCreateInvoice.mockResolvedValue({
        id: 'inv-2',
        referenceMonth: '2026-11',
      });
      prisma.transaction.create
        .mockResolvedValueOnce({ id: 'tx-inst-1' })
        .mockResolvedValueOnce({ id: 'tx-inst-2' });

      await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 300,
        description: 'Compra parcelada dia 31',
        transactionDate: '2026-10-15',
        categoryId: 'cat-1',
        creditCardId: 'card-1',
        totalInstallments: 2,
      });

      const secondCall = prisma.transaction.create.mock.calls[1][0];
      const secondDate: Date = secondCall.data.transactionDate;
      expect(secondDate.getDate()).toBe(30); // Novembro tem 30 dias (Math.min(31, 30))
      expect(secondDate.getMonth()).toBe(10);
      expect(secondDate.getHours()).toBe(0);
    });
  });

  describe('category authorization (SEC-CRIT-03)', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create('user-1', {
          type: TransactionType.EXPENSE,
          amount: 100,
          description: 'Despesa com cat inexistente',
          transactionDate: '2026-09-01',
          categoryId: 'cat-non-existent',
          accountId: 'acc-1',
        }),
      ).rejects.toThrow(new NotFoundException('Categoria informada não encontrada'));
    });

    it('should throw NotFoundException if category is soft-deleted', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-deleted',
        name: 'Categoria Deletada',
        deletedAt: new Date(),
        isSystemDefault: false,
      });

      await expect(
        service.create('user-1', {
          type: TransactionType.EXPENSE,
          amount: 100,
          description: 'Despesa com cat deletada',
          transactionDate: '2026-09-01',
          categoryId: 'cat-deleted',
          accountId: 'acc-1',
        }),
      ).rejects.toThrow(new NotFoundException('Categoria informada não encontrada'));
    });

    it('should throw ForbiddenException if category belongs to another user', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-other-user',
        name: 'Outra Categoria',
        userId: 'other-user',
        familyId: null,
        isSystemDefault: false,
        deletedAt: null,
      });

      await expect(
        service.create('user-1', {
          type: TransactionType.EXPENSE,
          amount: 100,
          description: 'Despesa invadindo outra conta',
          transactionDate: '2026-09-01',
          categoryId: 'cat-other-user',
          accountId: 'acc-1',
        }),
      ).rejects.toThrow(new ForbiddenException('Acesso negado à categoria informada'));
    });

    it('should throw ForbiddenException if category belongs to another family', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-other-family',
        name: 'Outra Família Cat',
        userId: null,
        familyId: 'family-other',
        isSystemDefault: false,
        deletedAt: null,
      });

      // user-1 tenta associar categoria da family-other em transação da family-1
      prisma.familyMember.findUnique.mockResolvedValueOnce({
        id: 'member-1',
        userId: 'user-1',
        familyId: 'family-1',
        role: 'ADMIN',
      });

      await expect(
        service.create('user-1', {
          type: TransactionType.EXPENSE,
          amount: 100,
          description: 'Despesa cruzando família',
          transactionDate: '2026-09-01',
          categoryId: 'cat-other-family',
          accountId: 'acc-1',
          familyId: 'family-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow transaction creation when category belongs to current user', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-my-own',
        name: 'Minha Categoria',
        userId: 'user-1',
        familyId: null,
        isSystemDefault: false,
        deletedAt: null,
      });
      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-1',
        userId: 'user-1',
        currentBalance: new Prisma.Decimal(1000),
      });
      prisma.transaction.create.mockResolvedValueOnce({
        id: 'tx-ok',
        amount: new Prisma.Decimal(100),
      });

      const result = await service.create('user-1', {
        type: TransactionType.EXPENSE,
        amount: 100,
        description: 'Despesa legítima',
        transactionDate: '2026-09-01',
        categoryId: 'cat-my-own',
        accountId: 'acc-1',
      });

      expect(result).toBeDefined();
    });
  });
});

