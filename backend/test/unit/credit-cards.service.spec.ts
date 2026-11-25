import { Test, TestingModule } from '@nestjs/testing';
import { CreditCardsService } from '../../src/modules/credit-cards/credit-cards.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('CreditCardsService', () => {
  let service: CreditCardsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      creditCard: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      creditCardInvoice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      account: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      familyMember: {
        findUnique: jest.fn(),
      },
      userFavoriteCreditCard: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditCardsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CreditCardsService>(CreditCardsService);
  });

  describe('create', () => {
    it('should create credit card and initialize current reference invoice', async () => {
      prisma.creditCard.create.mockResolvedValue({
        id: 'card-1',
        name: 'Nubank',
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 20,
        dueDay: 27,
      });

      prisma.creditCardInvoice.findUnique.mockResolvedValue(null);
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        closingDay: 20,
        dueDay: 27,
      });
      prisma.creditCardInvoice.create.mockResolvedValue({
        id: 'inv-1',
        creditCardId: 'card-1',
        referenceMonth: '2026-09',
        status: InvoiceStatus.OPEN,
      });

      const result = await service.create('user-1', {
        name: 'Nubank',
        creditLimit: 2000,
        closingDay: 20,
        dueDay: 27,
      });

      expect(result.id).toBe('card-1');
      expect(prisma.creditCard.create).toHaveBeenCalled();
      expect(prisma.creditCardInvoice.create).toHaveBeenCalled();
    });

    it('should initialize next open invoice when closingDay has already passed in current month', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 9, 9, 10, 0, 0));

      prisma.creditCard.create.mockResolvedValue({
        id: 'card-past',
        name: 'Inter',
        creditLimit: new Prisma.Decimal(1000),
        closingDay: 2,
        dueDay: 5,
      });

      prisma.creditCardInvoice.findUnique.mockResolvedValue(null);
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-past',
        closingDay: 2,
        dueDay: 5,
      });
      prisma.creditCardInvoice.create.mockResolvedValue({
        id: 'inv-next',
        creditCardId: 'card-past',
        referenceMonth: '2026-11',
        status: InvoiceStatus.OPEN,
      });

      const result = await service.create('user-1', {
        name: 'Inter',
        creditLimit: 1000,
        closingDay: 2,
        dueDay: 5,
      });

      expect(result.id).toBe('card-past');
      expect(prisma.creditCardInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            creditCardId: 'card-past',
            referenceMonth: '2026-11',
            status: InvoiceStatus.OPEN,
          }),
        }),
      );

      jest.useRealTimers();
    });

    it('should throw NotFoundException if accountId does not exist (SEC-HIGH-01)', async () => {
      prisma.account.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create('user-1', {
          name: 'Nubank',
          creditLimit: 2000,
          closingDay: 20,
          dueDay: 27,
          accountId: 'acc-non-existent',
        }),
      ).rejects.toThrow(new NotFoundException('Conta bancária informada não encontrada'));
    });

    it('should throw NotFoundException if accountId is soft-deleted (SEC-HIGH-01)', async () => {
      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-del',
        deletedAt: new Date(),
        userId: 'user-1',
        familyId: null,
      });

      await expect(
        service.create('user-1', {
          name: 'Nubank',
          creditLimit: 2000,
          closingDay: 20,
          dueDay: 27,
          accountId: 'acc-del',
        }),
      ).rejects.toThrow(new NotFoundException('Conta bancária informada não encontrada'));
    });

    it('should throw ForbiddenException if accountId belongs to another user (SEC-HIGH-01)', async () => {
      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-other-user',
        deletedAt: null,
        userId: 'other-user',
        familyId: null,
      });

      await expect(
        service.create('user-1', {
          name: 'Nubank',
          creditLimit: 2000,
          closingDay: 20,
          dueDay: 27,
          accountId: 'acc-other-user',
        }),
      ).rejects.toThrow(new ForbiddenException('A conta bancária informada não pertence ao seu escopo pessoal'));
    });

    it('should throw ForbiddenException if accountId belongs to another family (SEC-HIGH-01)', async () => {
      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-other-family',
        deletedAt: null,
        userId: 'user-1',
        familyId: 'family-other',
      });

      prisma.familyMember.findUnique.mockResolvedValueOnce({
        id: 'fm-1',
        userId: 'user-1',
        familyId: 'family-1',
        role: 'ADMIN',
      });

      await expect(
        service.create('user-1', {
          name: 'Nubank Familiar',
          creditLimit: 2000,
          closingDay: 20,
          dueDay: 27,
          familyId: 'family-1',
          accountId: 'acc-other-family',
        }),
      ).rejects.toThrow(new ForbiddenException('A conta bancária informada não pertence ao grupo familiar do cartão'));
    });

    it('should create credit card when accountId is valid and owned by user (SEC-HIGH-01)', async () => {
      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-valid',
        deletedAt: null,
        userId: 'user-1',
        familyId: null,
      });
      prisma.creditCard.create.mockResolvedValueOnce({
        id: 'card-acc-ok',
        name: 'Nubank Com Conta',
        accountId: 'acc-valid',
      });
      prisma.creditCardInvoice.findUnique.mockResolvedValue(null);
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-acc-ok',
        closingDay: 20,
        dueDay: 27,
      });
      prisma.creditCardInvoice.create.mockResolvedValue({});

      const result = await service.create('user-1', {
        name: 'Nubank Com Conta',
        creditLimit: 2000,
        closingDay: 20,
        dueDay: 27,
        accountId: 'acc-valid',
      });

      expect(result.id).toBe('card-acc-ok');
    });
  });

  describe('determineInvoiceForDate', () => {
    it('should allocate to current month invoice if date < closingDay', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        closingDay: 20,
        dueDay: 27,
      });

      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-sep',
        referenceMonth: '2026-09',
        status: InvoiceStatus.OPEN,
      });

      const invoice = await service.determineInvoiceForDate('card-1', '2026-09-15');
      expect(invoice.referenceMonth).toBe('2026-09');
    });

    it('should allocate to next month invoice if date is on closingDay', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        closingDay: 20,
        dueDay: 27,
      });

      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-oct',
        referenceMonth: '2026-10',
        status: InvoiceStatus.OPEN,
      });

      const invoice = await service.determineInvoiceForDate('card-1', '2026-09-20');
      expect(invoice.referenceMonth).toBe('2026-10');
    });

    it('should allocate to next month invoice if date > closingDay', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        closingDay: 20,
        dueDay: 27,
      });

      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-oct',
        referenceMonth: '2026-10',
        status: InvoiceStatus.OPEN,
      });

      const invoice = await service.determineInvoiceForDate('card-1', '2026-09-22');
      expect(invoice.referenceMonth).toBe('2026-10');
    });

    it('should allow retroactively allocating to CLOSED invoice without skipping', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        closingDay: 20,
        dueDay: 27,
      });

      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-sep',
        referenceMonth: '2026-09',
        status: InvoiceStatus.CLOSED,
      });

      const invoice = await service.determineInvoiceForDate('card-1', '2026-09-10');
      expect(invoice.referenceMonth).toBe('2026-09');
      expect(invoice.status).toBe(InvoiceStatus.CLOSED);
    });

    it('should throw BadRequestException if invoice is already PAID', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        closingDay: 20,
        dueDay: 27,
      });

      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-sep',
        referenceMonth: '2026-09',
        status: InvoiceStatus.PAID,
      });

      await expect(
        service.determineInvoiceForDate('card-1', '2026-09-10'),
      ).rejects.toThrow(new BadRequestException('Não é possível adicionar lançamentos na fatura 2026-09 porque ela já foi totalmente paga'));
    });
  });

  describe('cleanupOrphanZeroInvoices', () => {
    it('should delete zero invoices that precede first valid invoice and zero invoices beyond active cycle, preserving gaps', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 9, 9, 12, 0, 0));

      prisma.creditCard.findMany.mockResolvedValue([{ id: 'card-1' }]);
      prisma.creditCard.findUnique.mockResolvedValue({ id: 'card-1', closingDay: 20 });
      prisma.creditCardInvoice.findMany.mockResolvedValue([
        { id: 'inv-06', referenceMonth: '2026-06', totalAmount: new Prisma.Decimal(0), paidAmount: new Prisma.Decimal(0), status: InvoiceStatus.CLOSED, transactions: [] },
        { id: 'inv-07', referenceMonth: '2026-07', totalAmount: new Prisma.Decimal(0), paidAmount: new Prisma.Decimal(0), status: InvoiceStatus.CLOSED, transactions: [] },
        { id: 'inv-08', referenceMonth: '2026-08', totalAmount: new Prisma.Decimal(100), paidAmount: new Prisma.Decimal(0), status: InvoiceStatus.CLOSED, transactions: [{ id: 'tx-1' }] },
        { id: 'inv-09', referenceMonth: '2026-09', totalAmount: new Prisma.Decimal(0), paidAmount: new Prisma.Decimal(0), status: InvoiceStatus.CLOSED, transactions: [] },
        { id: 'inv-10', referenceMonth: '2026-10', totalAmount: new Prisma.Decimal(0), paidAmount: new Prisma.Decimal(0), status: InvoiceStatus.OPEN, transactions: [] },
        { id: 'inv-11', referenceMonth: '2026-11', totalAmount: new Prisma.Decimal(150), paidAmount: new Prisma.Decimal(0), status: InvoiceStatus.OPEN, transactions: [{ id: 'tx-2' }] },
        { id: 'inv-future', referenceMonth: '2027-07', totalAmount: new Prisma.Decimal(0), paidAmount: new Prisma.Decimal(0), status: InvoiceStatus.OPEN, transactions: [] },
      ]);

      await service.cleanupOrphanZeroInvoices('card-1');

      expect(prisma.creditCardInvoice.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['inv-06', 'inv-07', 'inv-future'] } },
      });

      jest.useRealTimers();
    });

    it('should clean all orphan invoices when card has no valid expenses, keeping only active current cycle', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 9, 9, 12, 0, 0));

      prisma.creditCard.findMany.mockResolvedValue([{ id: 'card-1' }]);
      prisma.creditCard.findUnique.mockResolvedValue({ id: 'card-1', closingDay: 20 });
      prisma.creditCardInvoice.findMany.mockResolvedValue([
        { id: 'inv-05', referenceMonth: '2026-05', totalAmount: new Prisma.Decimal(0), paidAmount: new Prisma.Decimal(0), status: InvoiceStatus.CLOSED, transactions: [] },
        { id: 'inv-10', referenceMonth: '2026-10', totalAmount: new Prisma.Decimal(0), paidAmount: new Prisma.Decimal(0), status: InvoiceStatus.OPEN, transactions: [] },
        { id: 'inv-27', referenceMonth: '2027-07', totalAmount: new Prisma.Decimal(0), paidAmount: new Prisma.Decimal(0), status: InvoiceStatus.OPEN, transactions: [] },
      ]);

      await service.cleanupOrphanZeroInvoices('card-1');

      expect(prisma.creditCardInvoice.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['inv-05', 'inv-27'] } },
      });

      jest.useRealTimers();
    });
  });

  describe('syncInvoiceStatuses', () => {
    it('should update OPEN invoices with closingDate <= today to CLOSED', async () => {
      await service.syncInvoiceStatuses('card-1');
      expect(prisma.creditCardInvoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            creditCardId: 'card-1',
            status: InvoiceStatus.OPEN,
            closingDate: expect.any(Object),
          }),
          data: { status: InvoiceStatus.CLOSED },
        }),
      );
    });
  });

  describe('payInvoice', () => {
    it('should pay invoice and debit from source bank account', async () => {
      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        totalAmount: new Prisma.Decimal(500),
        paidAmount: new Prisma.Decimal(0),
        status: InvoiceStatus.OPEN,
        creditCard: {
          id: 'card-1',
          name: 'Nubank',
          userId: 'user-1',
        },
      });

      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        currentBalance: new Prisma.Decimal(1000),
        deletedAt: null,
      });

      prisma.creditCardInvoice.update.mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatus.PAID,
        paidAmount: new Prisma.Decimal(500),
      });

      prisma.category.findFirst.mockResolvedValue({ id: 'cat-pay' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-pay' });
      prisma.account.update.mockResolvedValue({ id: 'acc-1' });

      const result = await service.payInvoice('user-1', 'inv-1', {
        accountId: 'acc-1',
      });

      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { currentBalance: { decrement: new Prisma.Decimal(500) } },
      });
    });

    it('should preserve CLOSED status when partial payment is made on closed invoice', async () => {
      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        totalAmount: new Prisma.Decimal(500),
        paidAmount: new Prisma.Decimal(0),
        status: InvoiceStatus.CLOSED,
        creditCard: {
          id: 'card-1',
          name: 'Nubank',
          userId: 'user-1',
        },
      });

      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        deletedAt: null,
      });
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-pay' });
      prisma.creditCardInvoice.update.mockImplementation(({ data }) => ({
        id: 'inv-1',
        ...data,
      }));
      prisma.transaction.create.mockResolvedValue({ id: 'tx-pay' });
      prisma.account.update.mockResolvedValue({ id: 'acc-1' });

      const result = await service.payInvoice('user-1', 'inv-1', {
        accountId: 'acc-1',
        amount: 200,
      });

      expect(result.status).toBe(InvoiceStatus.CLOSED);
      expect(result.paidAmount).toEqual(new Prisma.Decimal(200));
    });

    it('should reject payment if invoice belongs to personal card of another user (SEC-CRIT-01)', async () => {
      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-victim',
        totalAmount: new Prisma.Decimal(500),
        paidAmount: new Prisma.Decimal(0),
        status: InvoiceStatus.OPEN,
        creditCard: {
          id: 'card-victim',
          userId: 'user-victim',
          familyId: null,
        },
      });

      await expect(
        service.payInvoice('user-attacker', 'inv-victim', {
          accountId: 'acc-attacker',
        }),
      ).rejects.toThrow(
        new ForbiddenException('Acesso negado à fatura informada'),
      );
    });

    it('should reject payment if bank account belongs to another user (SEC-CRIT-01)', async () => {
      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-attacker',
        totalAmount: new Prisma.Decimal(500),
        paidAmount: new Prisma.Decimal(0),
        status: InvoiceStatus.OPEN,
        creditCard: {
          id: 'card-attacker',
          userId: 'user-attacker',
          familyId: null,
        },
      });

      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-victim',
        userId: 'user-victim',
        familyId: null,
        deletedAt: null,
      });

      await expect(
        service.payInvoice('user-attacker', 'inv-attacker', {
          accountId: 'acc-victim',
        }),
      ).rejects.toThrow(
        new ForbiddenException('Você não tem permissão para debitar desta conta bancária'),
      );
    });

    it('should reject payment if payment bank account is soft-deleted', async () => {
      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-attacker',
        totalAmount: new Prisma.Decimal(500),
        paidAmount: new Prisma.Decimal(0),
        status: InvoiceStatus.OPEN,
        creditCard: {
          id: 'card-attacker',
          userId: 'user-attacker',
          familyId: null,
        },
      });

      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-deleted',
        userId: 'user-attacker',
        familyId: null,
        deletedAt: new Date(),
      });

      await expect(
        service.payInvoice('user-attacker', 'inv-attacker', {
          accountId: 'acc-deleted',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all invoices and calculate committedAmount and availableLimit accurately without 6 invoices cap', async () => {
      // Simula 10 faturas de R$ 10,00 cada
      const mockInvoices = Array.from({ length: 10 }, (_, i) => ({
        id: `inv-${i + 1}`,
        creditCardId: 'card-1',
        referenceMonth: `2026-${String(i + 1).padStart(2, '0')}`,
        status: InvoiceStatus.OPEN,
        totalAmount: new Prisma.Decimal(10),
        paidAmount: new Prisma.Decimal(0),
      }));

      prisma.creditCard.findMany.mockResolvedValue([
        {
          id: 'card-1',
          name: 'Nubank',
          creditLimit: new Prisma.Decimal(1000),
          invoices: mockInvoices,
        },
      ]);

      const result = await service.findAll('user-1');

      expect(prisma.creditCard.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', familyId: null, isActive: true, deletedAt: null },
        include: {
          invoices: {
            orderBy: { referenceMonth: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].invoices).toHaveLength(10);
      expect(result[0].committedAmount.toNumber()).toBe(100);
      expect(result[0].availableLimit.toNumber()).toBe(900);
    });
  });

  describe('getInvoiceDetails', () => {
    it('should aggregate transactions by person accurately in invoice', async () => {
      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        referenceMonth: '2026-09',
        totalAmount: new Prisma.Decimal(650),
        creditCard: {
          id: 'card-1',
          userId: 'user-1',
          familyId: 'fam-1',
        },
        transactions: [
          {
            id: 'tx-1',
            amount: new Prisma.Decimal(200),
            personId: 'person-pedro',
            person: { id: 'person-pedro', name: 'Pedro', color: '#3b82f6' },
          },
          {
            id: 'tx-2',
            amount: new Prisma.Decimal(150),
            personId: 'person-pedro',
            person: { id: 'person-pedro', name: 'Pedro', color: '#3b82f6' },
          },
          {
            id: 'tx-3',
            amount: new Prisma.Decimal(300),
            personId: null,
            person: null,
          },
        ],
      });

      const result = await service.getInvoiceDetails('user-1', 'inv-1');

      expect(result.id).toBe('inv-1');
      expect(result.personBreakdown).toHaveLength(2);

      const pedroBreakdown = result.personBreakdown.find((b: any) => b.personId === 'person-pedro');
      expect(pedroBreakdown).toBeDefined();
      expect(pedroBreakdown.totalAmount).toBe(350);
      expect(pedroBreakdown.count).toBe(2);

      const unassigned = result.personBreakdown.find((b: any) => b.personId === null);
      expect(unassigned).toBeDefined();
      expect(unassigned.totalAmount).toBe(300);
      expect(unassigned.count).toBe(1);
    });

    it('should query only active transactions (where deletedAt is null) in invoice details', async () => {
      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        referenceMonth: '2026-09',
        totalAmount: new Prisma.Decimal(0),
        creditCard: {
          id: 'card-1',
          userId: 'user-1',
          familyId: null,
        },
        transactions: [],
      });

      const result = await service.getInvoiceDetails('user-1', 'inv-1');

      expect(prisma.creditCardInvoice.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        include: {
          creditCard: true,
          transactions: {
            where: {
              deletedAt: null,
            },
            include: {
              category: true,
              person: {
                select: { id: true, name: true, color: true, avatarUrl: true },
              },
            },
            orderBy: { transactionDate: 'desc' },
          },
        },
      });
      expect(result.transactions).toHaveLength(0);
      expect(result.personTotals).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update credit card properties successfully', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        name: 'Nubank',
        brand: 'Mastercard',
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 20,
        dueDay: 27,
        color: '#8b5cf6',
        isActive: true,
        invoices: [],
      });
      prisma.creditCard.update.mockResolvedValue({
        id: 'card-1',
        name: 'Nubank Ultravioleta',
        creditLimit: new Prisma.Decimal(5000),
      });

      const result = await service.update('user-1', 'card-1', {
        name: 'Nubank Ultravioleta',
        creditLimit: 5000,
      });

      expect(prisma.creditCard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'card-1' },
          data: expect.objectContaining({
            name: 'Nubank Ultravioleta',
            creditLimit: new Prisma.Decimal(5000),
          }),
        }),
      );
      expect(result.id).toBe('card-1');
    });

    it('should synchronize open invoices closing and due dates when days change', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        name: 'Nubank',
        closingDay: 15,
        dueDay: 22,
        creditLimit: new Prisma.Decimal(2000),
        invoices: [],
      });
      prisma.creditCardInvoice.findMany.mockResolvedValue([
        {
          id: 'inv-open',
          creditCardId: 'card-1',
          referenceMonth: '2026-09',
          status: InvoiceStatus.OPEN,
        },
      ]);
      prisma.creditCard.update.mockResolvedValue({ id: 'card-1' });

      await service.update('user-1', 'card-1', {
        closingDay: 20,
        dueDay: 27,
      });

      expect(prisma.creditCardInvoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-open' },
        data: {
          closingDate: new Date(2026, 8, 20),
          dueDate: new Date(2026, 8, 27),
        },
      });
    });

    it('should throw NotFoundException if card does not exist', async () => {
      prisma.creditCard.findUnique.mockResolvedValue(null);

      await expect(service.update('user-1', 'card-none', { name: 'Novo' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user has no access', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-other',
        familyId: null,
      });

      await expect(service.update('user-1', 'card-1', { name: 'Novo' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if creditLimit <= 0', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        creditLimit: new Prisma.Decimal(1000),
        invoices: [],
      });

      await expect(service.update('user-1', 'card-1', { creditLimit: 0 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if closingDay is invalid', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        creditLimit: new Prisma.Decimal(1000),
        invoices: [],
      });

      await expect(service.update('user-1', 'card-1', { closingDay: 35 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if dueDay is invalid', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        creditLimit: new Prisma.Decimal(1000),
        invoices: [],
      });

      await expect(service.update('user-1', 'card-1', { dueDay: 0 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if updated accountId belongs to another user (SEC-HIGH-01)', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        creditLimit: new Prisma.Decimal(1000),
        invoices: [],
      });
      prisma.account.findUnique.mockResolvedValueOnce({
        id: 'acc-other',
        userId: 'other-user',
        familyId: null,
        deletedAt: null,
      });

      await expect(
        service.update('user-1', 'card-1', { accountId: 'acc-other' }),
      ).rejects.toThrow(new ForbiddenException('A conta bancária informada não pertence ao seu escopo pessoal'));
    });
  });

  describe('remove', () => {
    it('should soft delete credit card when it has no active transactions', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        creditLimit: new Prisma.Decimal(1000),
        invoices: [],
        deletedAt: null,
      });
      prisma.transaction.findFirst.mockResolvedValue(null);
      prisma.creditCard.update.mockResolvedValue({ id: 'card-1' });

      const result = await service.remove('user-1', 'card-1');

      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { creditCardId: 'card-1', deletedAt: null },
      });
      expect(prisma.creditCard.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { deletedAt: expect.any(Date), isActive: false },
      });
      expect(result.message).toContain('removido com sucesso');
    });

    it('should throw BadRequestException when card has linked active transactions', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        creditLimit: new Prisma.Decimal(1000),
        invoices: [],
        deletedAt: null,
      });
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1' });

      await expect(service.remove('user-1', 'card-1')).rejects.toThrow(BadRequestException);
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when card is already soft-deleted', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        deletedAt: new Date(),
      });

      await expect(service.remove('user-1', 'card-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('RBAC VIEWER permissions', () => {
    it('should throw ForbiddenException when VIEWER tries to create family credit card', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(
        service.create('user-viewer', {
          name: 'Cartão Familiar',
          creditLimit: 5000,
          closingDay: 10,
          dueDay: 17,
          familyId: 'family-1',
        }),
      ).rejects.toThrow(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    });

    it('should throw ForbiddenException when VIEWER tries to update family credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        name: 'Cartão Familiar',
        creditLimit: new Prisma.Decimal(5000),
        closingDay: 10,
        dueDay: 17,
        invoices: [],
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(
        service.update('user-viewer', 'card-fam-1', {
          name: 'Nome Alterado',
        }),
      ).rejects.toThrow(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    });

    it('should throw ForbiddenException when VIEWER tries to pay family credit card invoice', async () => {
      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        creditCard: {
          id: 'card-fam-1',
          userId: 'user-owner',
          familyId: 'family-1',
          name: 'Cartão Familiar',
        },
        status: InvoiceStatus.OPEN,
        totalAmount: new Prisma.Decimal(500),
        paidAmount: new Prisma.Decimal(0),
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(
        service.payInvoice('user-viewer', 'inv-1', {
          accountId: 'acc-1',
        }),
      ).rejects.toThrow(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    });

    it('should allow VIEWER to list family credit cards via findAll', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });
      prisma.creditCard.findMany.mockResolvedValue([
        {
          id: 'card-fam-1',
          name: 'Cartão Familiar',
          familyId: 'family-1',
          creditLimit: new Prisma.Decimal(5000),
          invoices: [],
        },
      ]);

      const result = await service.findAll('user-viewer', 'family-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findAll (archived filter)', () => {
    it('should filter only active cards in personal scope by default', async () => {
      const activeCards = [
        {
          id: 'card-1',
          name: 'Nubank',
          isActive: true,
          creditLimit: new Prisma.Decimal(2000),
          invoices: [],
        },
      ];
      prisma.creditCard.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(activeCards);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('card-1');
      expect(prisma.creditCard.findMany).toHaveBeenLastCalledWith({
        where: {
          userId: 'user-1',
          familyId: null,
          isActive: true,
          deletedAt: null,
        },
        include: {
          invoices: {
            orderBy: { referenceMonth: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter only active cards in family scope when includeArchived is false', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      const familyActive = [
        {
          id: 'card-fam-1',
          name: 'Itaú',
          isActive: true,
          creditLimit: new Prisma.Decimal(3000),
          invoices: [],
        },
      ];
      prisma.creditCard.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(familyActive);

      const result = await service.findAll('user-1', 'family-1', false);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('card-fam-1');
      expect(prisma.creditCard.findMany).toHaveBeenLastCalledWith({
        where: {
          familyId: 'family-1',
          isActive: true,
          deletedAt: null,
        },
        include: {
          invoices: {
            orderBy: { referenceMonth: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include archived cards in personal scope when includeArchived is true', async () => {
      const allCards = [
        {
          id: 'card-1',
          name: 'Nubank',
          isActive: true,
          creditLimit: new Prisma.Decimal(2000),
          invoices: [],
        },
        {
          id: 'card-2',
          name: 'Inter Antigo',
          isActive: false,
          creditLimit: new Prisma.Decimal(1500),
          invoices: [],
        },
      ];
      prisma.creditCard.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(allCards);

      const result = await service.findAll('user-1', undefined, true);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['card-1', 'card-2']);
      expect(prisma.creditCard.findMany).toHaveBeenLastCalledWith({
        where: {
          userId: 'user-1',
          familyId: null,
          deletedAt: null,
        },
        include: {
          invoices: {
            orderBy: { referenceMonth: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include archived cards in family scope when includeArchived is true', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });
      const allFamilyCards = [
        {
          id: 'card-fam-1',
          name: 'Itaú',
          isActive: true,
          creditLimit: new Prisma.Decimal(3000),
          invoices: [],
        },
        {
          id: 'card-fam-2',
          name: 'Bradesco',
          isActive: false,
          creditLimit: new Prisma.Decimal(1000),
          invoices: [],
        },
      ];
      prisma.creditCard.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(allFamilyCards);

      const result = await service.findAll('user-viewer', 'family-1', true);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['card-fam-1', 'card-fam-2']);
      expect(prisma.creditCard.findMany).toHaveBeenLastCalledWith({
        where: {
          familyId: 'family-1',
          deletedAt: null,
        },
        include: {
          invoices: {
            orderBy: { referenceMonth: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('archive', () => {
    it('should archive an active personal card setting isActive false', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        invoices: [],
        deletedAt: null,
      });
      const archived = { id: 'card-1', isActive: false };
      prisma.creditCard.update.mockResolvedValue(archived);

      const result = await service.archive('user-1', 'card-1');

      expect(result).toEqual({ ...archived, isFavorite: false });
      expect(result.isActive).toBe(false);
      expect(prisma.creditCard.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { isActive: false },
      });
    });

    it('should archive an active family card when user is MEMBER or ADMIN', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isActive: true,
        creditLimit: new Prisma.Decimal(5000),
        invoices: [],
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-member',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      const archived = { id: 'card-fam-1', isActive: false };
      prisma.creditCard.update.mockResolvedValue(archived);

      const result = await service.archive('user-member', 'card-fam-1');

      expect(result).toEqual({ ...archived, isFavorite: false });
      expect(prisma.creditCard.update).toHaveBeenCalledWith({
        where: { id: 'card-fam-1' },
        data: { isActive: false },
      });
    });

    it('should throw BadRequestException if card is already archived', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        isActive: false,
        creditLimit: new Prisma.Decimal(2000),
        invoices: [],
        deletedAt: null,
      });

      await expect(service.archive('user-1', 'card-1')).rejects.toThrow(
        new BadRequestException('O cartão de crédito já está arquivado'),
      );
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if card to archive does not exist', async () => {
      prisma.creditCard.findUnique.mockResolvedValue(null);

      await expect(service.archive('user-1', 'card-missing')).rejects.toThrow(NotFoundException);
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if card to archive is soft-deleted', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-deleted',
        userId: 'user-1',
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        invoices: [],
        deletedAt: new Date(),
      });

      await expect(service.archive('user-1', 'card-deleted')).rejects.toThrow(NotFoundException);
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when VIEWER tries to archive family card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isActive: true,
        creditLimit: new Prisma.Decimal(5000),
        invoices: [],
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(service.archive('user-viewer', 'card-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when another user tries to archive personal card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-owner',
        familyId: null,
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        invoices: [],
        deletedAt: null,
      });

      await expect(service.archive('user-intruder', 'card-1')).rejects.toThrow(
        new ForbiddenException('Acesso negado ao cartão'),
      );
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });
  });

  describe('unarchive', () => {
    it('should unarchive an archived personal card setting isActive true', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        isActive: false,
        creditLimit: new Prisma.Decimal(2000),
        invoices: [],
        deletedAt: null,
      });
      const reactivated = { id: 'card-1', isActive: true };
      prisma.creditCard.update.mockResolvedValue(reactivated);

      const result = await service.unarchive('user-1', 'card-1');

      expect(result).toEqual({ ...reactivated, isFavorite: false });
      expect(result.isActive).toBe(true);
      expect(prisma.creditCard.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { isActive: true },
      });
    });

    it('should unarchive an archived family card when user is MEMBER or ADMIN', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isActive: false,
        creditLimit: new Prisma.Decimal(5000),
        invoices: [],
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-member',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      const reactivated = { id: 'card-fam-1', isActive: true };
      prisma.creditCard.update.mockResolvedValue(reactivated);

      const result = await service.unarchive('user-member', 'card-fam-1');

      expect(result).toEqual({ ...reactivated, isFavorite: false });
      expect(prisma.creditCard.update).toHaveBeenCalledWith({
        where: { id: 'card-fam-1' },
        data: { isActive: true },
      });
    });

    it('should throw BadRequestException if card is already active', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        invoices: [],
        deletedAt: null,
      });

      await expect(service.unarchive('user-1', 'card-1')).rejects.toThrow(
        new BadRequestException('O cartão de crédito não está arquivado'),
      );
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if card to unarchive does not exist', async () => {
      prisma.creditCard.findUnique.mockResolvedValue(null);

      await expect(service.unarchive('user-1', 'card-missing')).rejects.toThrow(NotFoundException);
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if card to unarchive is soft-deleted', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-deleted',
        userId: 'user-1',
        isActive: false,
        creditLimit: new Prisma.Decimal(2000),
        invoices: [],
        deletedAt: new Date(),
      });

      await expect(service.unarchive('user-1', 'card-deleted')).rejects.toThrow(NotFoundException);
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when VIEWER tries to unarchive family card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isActive: false,
        creditLimit: new Prisma.Decimal(5000),
        invoices: [],
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(service.unarchive('user-viewer', 'card-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when another user tries to unarchive personal card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-owner',
        familyId: null,
        isActive: false,
        creditLimit: new Prisma.Decimal(2000),
        invoices: [],
        deletedAt: null,
      });

      await expect(service.unarchive('user-intruder', 'card-1')).rejects.toThrow(
        new ForbiddenException('Acesso negado ao cartão'),
      );
      expect(prisma.creditCard.update).not.toHaveBeenCalled();
    });
  });

  describe('favorite', () => {
    it('should favorite an active personal credit card and return isFavorite: true', async () => {
      const card = {
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        name: 'Nubank',
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      };
      prisma.creditCard.findUnique.mockResolvedValue(card);
      prisma.userFavoriteCreditCard.upsert.mockResolvedValue({
        userId: 'user-1',
        creditCardId: 'card-1',
      });

      const result = await service.favorite('user-1', 'card-1');

      expect(prisma.userFavoriteCreditCard.upsert).toHaveBeenCalledWith({
        where: { userId_creditCardId: { userId: 'user-1', creditCardId: 'card-1' } },
        create: { userId: 'user-1', creditCardId: 'card-1' },
        update: {},
      });
      expect(result).toEqual({
        ...card,
        committedAmount: new Prisma.Decimal(0),
        availableLimit: new Prisma.Decimal(2000),
        isFavorite: true,
      });
    });

    it('should favorite an active family credit card when user has write access', async () => {
      const card = {
        id: 'card-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        name: 'Cartão Família',
        isActive: true,
        creditLimit: new Prisma.Decimal(5000),
        closingDay: 15,
        invoices: [],
        deletedAt: null,
      };
      prisma.creditCard.findUnique.mockResolvedValue(card);
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-2',
        userId: 'user-member',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      prisma.userFavoriteCreditCard.upsert.mockResolvedValue({
        userId: 'user-member',
        creditCardId: 'card-fam-1',
      });

      const result = await service.favorite('user-member', 'card-fam-1');

      expect(prisma.userFavoriteCreditCard.upsert).toHaveBeenCalledWith({
        where: {
          userId_creditCardId: { userId: 'user-member', creditCardId: 'card-fam-1' },
        },
        create: { userId: 'user-member', creditCardId: 'card-fam-1' },
        update: {},
      });
      expect(result).toEqual({
        ...card,
        committedAmount: new Prisma.Decimal(0),
        availableLimit: new Prisma.Decimal(5000),
        isFavorite: true,
      });
    });

    it('should handle repeated favorite idempotently via upsert without duplicate error', async () => {
      const card = {
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        name: 'Nubank',
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      };
      prisma.creditCard.findUnique.mockResolvedValue(card);
      prisma.userFavoriteCreditCard.findUnique.mockResolvedValue({
        userId: 'user-1',
        creditCardId: 'card-1',
      });
      prisma.userFavoriteCreditCard.upsert.mockResolvedValue({
        userId: 'user-1',
        creditCardId: 'card-1',
      });

      const first = await service.favorite('user-1', 'card-1');
      const second = await service.favorite('user-1', 'card-1');

      expect(first.isFavorite).toBe(true);
      expect(second.isFavorite).toBe(true);
      expect(prisma.userFavoriteCreditCard.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.userFavoriteCreditCard.upsert).toHaveBeenCalledWith({
        where: { userId_creditCardId: { userId: 'user-1', creditCardId: 'card-1' } },
        create: { userId: 'user-1', creditCardId: 'card-1' },
        update: {},
      });
    });

    it('should throw BadRequestException with exact message when favoriting an archived credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-arch',
        userId: 'user-1',
        familyId: null,
        isActive: false,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      });

      await expect(service.favorite('user-1', 'card-arch')).rejects.toThrow(
        new BadRequestException('Não é possível favoritar um cartão arquivado'),
      );
      expect(prisma.userFavoriteCreditCard.upsert).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when favoriting a missing credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue(null);

      await expect(service.favorite('user-1', 'card-missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.userFavoriteCreditCard.upsert).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when favoriting a soft-deleted credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-deleted',
        userId: 'user-1',
        familyId: null,
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: new Date(),
      });

      await expect(service.favorite('user-1', 'card-deleted')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.userFavoriteCreditCard.upsert).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when VIEWER tries to favorite family credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isActive: true,
        creditLimit: new Prisma.Decimal(5000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-viewer',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(service.favorite('user-viewer', 'card-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );
      expect(prisma.userFavoriteCreditCard.upsert).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when unauthorized user tries to favorite personal credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-other',
        userId: 'user-owner',
        familyId: null,
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      });

      await expect(service.favorite('user-intruder', 'card-other')).rejects.toThrow(
        new ForbiddenException('Acesso negado ao cartão'),
      );
      expect(prisma.userFavoriteCreditCard.upsert).not.toHaveBeenCalled();
    });
  });

  describe('unfavorite', () => {
    it('should remove only the caller favorite link and return isFavorite: false', async () => {
      const card = {
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        name: 'Nubank',
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      };
      prisma.creditCard.findUnique.mockResolvedValue(card);
      prisma.userFavoriteCreditCard.findUnique.mockResolvedValue({
        userId: 'user-1',
        creditCardId: 'card-1',
      });
      prisma.userFavoriteCreditCard.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unfavorite('user-1', 'card-1');

      expect(prisma.userFavoriteCreditCard.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', creditCardId: 'card-1' },
      });
      expect(result).toEqual({
        ...card,
        committedAmount: new Prisma.Decimal(0),
        availableLimit: new Prisma.Decimal(2000),
        isFavorite: false,
      });
    });

    it('should unfavorite idempotently when credit card was not favorited', async () => {
      const card = {
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        name: 'Nubank',
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      };
      prisma.creditCard.findUnique.mockResolvedValue(card);
      prisma.userFavoriteCreditCard.findUnique.mockResolvedValue(null);
      prisma.userFavoriteCreditCard.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.unfavorite('user-1', 'card-1');

      expect(prisma.userFavoriteCreditCard.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', creditCardId: 'card-1' },
      });
      expect(result).toEqual({
        ...card,
        committedAmount: new Prisma.Decimal(0),
        availableLimit: new Prisma.Decimal(2000),
        isFavorite: false,
      });
    });

    it('should throw NotFoundException when unfavoriting a missing credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue(null);

      await expect(service.unfavorite('user-1', 'card-missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.userFavoriteCreditCard.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when unfavoriting a soft-deleted credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-deleted',
        userId: 'user-1',
        familyId: null,
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: new Date(),
      });

      await expect(service.unfavorite('user-1', 'card-deleted')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.userFavoriteCreditCard.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when VIEWER tries to unfavorite family credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-fam-1',
        userId: 'user-owner',
        familyId: 'family-1',
        isActive: true,
        creditLimit: new Prisma.Decimal(5000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-viewer',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(service.unfavorite('user-viewer', 'card-fam-1')).rejects.toThrow(
        new ForbiddenException(
          'Membros com perfil de apenas visualização não podem realizar alterações',
        ),
      );
      expect(prisma.userFavoriteCreditCard.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when unauthorized user tries to unfavorite personal credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-other',
        userId: 'user-owner',
        familyId: null,
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      });

      await expect(service.unfavorite('user-intruder', 'card-other')).rejects.toThrow(
        new ForbiddenException('Acesso negado ao cartão'),
      );
      expect(prisma.userFavoriteCreditCard.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('favorites ordering, limit preservation, and isolation', () => {
    it('should sort multiple favorite cards first using isFavorite DESC, createdAt DESC while preserving committedAmount and availableLimit', async () => {
      const openInvoice = {
        id: 'inv-1',
        status: InvoiceStatus.OPEN,
        totalAmount: new Prisma.Decimal(300),
        paidAmount: new Prisma.Decimal(50),
      };
      const cardNewNonFav = {
        id: 'card-4',
        name: 'Novo Não Fav',
        creditLimit: new Prisma.Decimal(1000),
        invoices: [],
        createdAt: new Date('2026-04-01T10:00:00Z'),
      };
      const cardNewFav = {
        id: 'card-3',
        name: 'Fav Novo',
        creditLimit: new Prisma.Decimal(2000),
        invoices: [openInvoice],
        createdAt: new Date('2026-03-01T10:00:00Z'),
      };
      const cardOldNonFav = {
        id: 'card-2',
        name: 'Antigo Não Fav',
        creditLimit: new Prisma.Decimal(1500),
        invoices: [],
        createdAt: new Date('2026-02-01T10:00:00Z'),
      };
      const cardOldFav = {
        id: 'card-1',
        name: 'Fav Antigo',
        creditLimit: new Prisma.Decimal(3000),
        invoices: [],
        createdAt: new Date('2026-01-01T10:00:00Z'),
      };

      prisma.creditCard.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([cardNewNonFav, cardNewFav, cardOldNonFav, cardOldFav]);
      prisma.userFavoriteCreditCard.findMany.mockResolvedValue([
        { creditCardId: 'card-1' },
        { creditCardId: 'card-3' },
      ]);

      const result = await service.findAll('user-1');

      expect(prisma.userFavoriteCreditCard.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          creditCardId: { in: ['card-4', 'card-3', 'card-2', 'card-1'] },
        },
        select: { creditCardId: true },
      });
      expect(result.map((c) => c.id)).toEqual(['card-3', 'card-1', 'card-4', 'card-2']);
      expect(result.map((c) => c.isFavorite)).toEqual([true, true, false, false]);
      expect(result[0].committedAmount).toEqual(new Prisma.Decimal(250));
      expect(result[0].availableLimit).toEqual(new Prisma.Decimal(1750));
    });

    it('should isolate family credit card favorites per user in findAll', async () => {
      const famCardNew = {
        id: 'card-fam-2',
        name: 'Itaú Família',
        familyId: 'family-1',
        creditLimit: new Prisma.Decimal(4000),
        invoices: [],
        createdAt: new Date('2026-03-01T10:00:00Z'),
      };
      const famCardOld = {
        id: 'card-fam-1',
        name: 'Nubank Família',
        familyId: 'family-1',
        creditLimit: new Prisma.Decimal(2500),
        invoices: [],
        createdAt: new Date('2026-01-01T10:00:00Z'),
      };

      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      prisma.creditCard.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([famCardNew, famCardOld])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([famCardNew, famCardOld]);
      prisma.userFavoriteCreditCard.findMany
        .mockResolvedValueOnce([{ creditCardId: 'card-fam-1' }])
        .mockResolvedValueOnce([]);

      const resultUserA = await service.findAll('user-a', 'family-1');
      const resultUserB = await service.findAll('user-b', 'family-1');

      expect(prisma.userFavoriteCreditCard.findMany).toHaveBeenNthCalledWith(1, {
        where: { userId: 'user-a', creditCardId: { in: ['card-fam-2', 'card-fam-1'] } },
        select: { creditCardId: true },
      });
      expect(prisma.userFavoriteCreditCard.findMany).toHaveBeenNthCalledWith(2, {
        where: { userId: 'user-b', creditCardId: { in: ['card-fam-2', 'card-fam-1'] } },
        select: { creditCardId: true },
      });
      expect(resultUserA.map((c) => ({ id: c.id, isFavorite: c.isFavorite }))).toEqual([
        { id: 'card-fam-1', isFavorite: true },
        { id: 'card-fam-2', isFavorite: false },
      ]);
      expect(resultUserB.map((c) => ({ id: c.id, isFavorite: c.isFavorite }))).toEqual([
        { id: 'card-fam-2', isFavorite: false },
        { id: 'card-fam-1', isFavorite: false },
      ]);
    });

    it('should return isFavorite reflecting only caller state in findById', async () => {
      const card = {
        id: 'card-fam-1',
        userId: 'user-a',
        familyId: 'family-1',
        name: 'Cartão Família',
        creditLimit: new Prisma.Decimal(3000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      };
      prisma.creditCard.findUnique.mockResolvedValue(card);
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-b',
        userId: 'user-b',
        familyId: 'family-1',
        role: 'MEMBER',
      });
      prisma.userFavoriteCreditCard.findUnique
        .mockResolvedValueOnce({ userId: 'user-a', creditCardId: 'card-fam-1' })
        .mockResolvedValueOnce(null);

      const resA = await service.findById('user-a', 'card-fam-1');
      const resB = await service.findById('user-b', 'card-fam-1');

      expect(resA.isFavorite).toBe(true);
      expect(resB.isFavorite).toBe(false);
      expect(resA.availableLimit).toEqual(new Prisma.Decimal(3000));
      expect(prisma.userFavoriteCreditCard.findUnique).toHaveBeenNthCalledWith(1, {
        where: { userId_creditCardId: { userId: 'user-a', creditCardId: 'card-fam-1' } },
      });
      expect(prisma.userFavoriteCreditCard.findUnique).toHaveBeenNthCalledWith(2, {
        where: { userId_creditCardId: { userId: 'user-b', creditCardId: 'card-fam-1' } },
      });
    });

    it('should return empty array without querying favorites when no credit cards exist', async () => {
      prisma.creditCard.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
      expect(prisma.userFavoriteCreditCard.findMany).not.toHaveBeenCalled();
    });
  });

  describe('favorites lifecycle on archive, unarchive, and remove', () => {
    it('should delete all favorite links for the card inside $transaction on archive and return isFavorite: false', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        isActive: true,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      });
      const archived = { id: 'card-1', isActive: false };
      prisma.creditCard.update.mockResolvedValue(archived);

      const result = await service.archive('user-1', 'card-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.userFavoriteCreditCard.deleteMany).toHaveBeenCalledWith({
        where: { creditCardId: 'card-1' },
      });
      expect(prisma.creditCard.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { isActive: false },
      });
      expect(result).toEqual({ ...archived, isFavorite: false });
    });

    it('should delete all favorite links for the card inside $transaction on remove', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        creditLimit: new Prisma.Decimal(1000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      });
      prisma.transaction.findFirst.mockResolvedValue(null);
      prisma.creditCard.update.mockResolvedValue({ id: 'card-1', isActive: false });

      const result = await service.remove('user-1', 'card-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.userFavoriteCreditCard.deleteMany).toHaveBeenCalledWith({
        where: { creditCardId: 'card-1' },
      });
      expect(prisma.creditCard.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { deletedAt: expect.any(Date), isActive: false },
      });
      expect(result).toEqual({ message: 'Cartão de crédito removido com sucesso' });
    });

    it('should return isFavorite: false after unarchiving a previously archived credit card', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        familyId: null,
        isActive: false,
        creditLimit: new Prisma.Decimal(2000),
        closingDay: 10,
        invoices: [],
        deletedAt: null,
      });
      const reactivated = { id: 'card-1', isActive: true };
      prisma.creditCard.update.mockResolvedValue(reactivated);

      const result = await service.unarchive('user-1', 'card-1');

      expect(result).toEqual({ ...reactivated, isFavorite: false });
    });
  });
});
