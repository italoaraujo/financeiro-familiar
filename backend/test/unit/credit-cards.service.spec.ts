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
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      creditCardInvoice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
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
        findFirst: jest.fn(),
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
  });

  describe('remove', () => {
    it('should remove credit card when it has no transactions', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        creditLimit: new Prisma.Decimal(1000),
        invoices: [],
      });
      prisma.transaction.findFirst.mockResolvedValue(null);
      prisma.creditCard.delete.mockResolvedValue({ id: 'card-1' });

      const result = await service.remove('user-1', 'card-1');

      expect(prisma.creditCard.delete).toHaveBeenCalledWith({
        where: { id: 'card-1' },
      });
      expect(result.message).toContain('removido com sucesso');
    });

    it('should throw BadRequestException when card has linked transactions', async () => {
      prisma.creditCard.findUnique.mockResolvedValue({
        id: 'card-1',
        userId: 'user-1',
        creditLimit: new Prisma.Decimal(1000),
        invoices: [],
      });
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1' });

      await expect(service.remove('user-1', 'card-1')).rejects.toThrow(BadRequestException);
      expect(prisma.creditCard.delete).not.toHaveBeenCalled();
    });
  });
});
