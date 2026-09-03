import { Test, TestingModule } from '@nestjs/testing';
import { CreditCardsService } from '../../src/modules/credit-cards/credit-cards.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CreditCardsService', () => {
  let service: CreditCardsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      creditCard: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      creditCardInvoice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
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
      },
      familyMember: {
        findUnique: jest.fn(),
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
  });

  describe('determineInvoiceForDate', () => {
    it('should allocate to current month invoice if date <= closingDay', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        closingDay: 20,
        dueDay: 27,
      });

      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-sep',
        referenceMonth: '2026-09',
      });

      const invoice = await service.determineInvoiceForDate('card-1', new Date('2026-09-15'));
      expect(invoice.referenceMonth).toBe('2026-09');
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
      });

      const invoice = await service.determineInvoiceForDate('card-1', new Date('2026-09-22'));
      expect(invoice.referenceMonth).toBe('2026-10');
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
        currentBalance: new Prisma.Decimal(1000),
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
        where: { userId: 'user-1', isActive: true },
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
  });
});
