import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { InvoiceStatus, Prisma } from '@prisma/client';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      account: {
        findMany: jest.fn(),
      },
      transaction: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
      creditCardInvoice: {
        findMany: jest.fn(),
      },
      goal: {
        aggregate: jest.fn(),
      },
      familyMember: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('getDashboardSummary', () => {
    it('should aggregate total balance, income, expenses and calculate net balance', async () => {
      prisma.account.findMany.mockResolvedValue([
        { id: 'acc-1', currentBalance: new Prisma.Decimal(2500) },
        { id: 'acc-2', currentBalance: new Prisma.Decimal(1500) },
      ]);

      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(5000) } }) // income
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(3200) } }); // expense

      prisma.goal.aggregate.mockResolvedValue({
        _sum: { currentAmount: new Prisma.Decimal(1200) },
      });

      prisma.creditCardInvoice.findMany.mockResolvedValue([]);
      prisma.transaction.findMany.mockResolvedValue([]);

      const summary = await service.getDashboardSummary('user-1', undefined, '2026-09');

      expect(summary.totalBalance).toEqual(new Prisma.Decimal(4000));
      expect(summary.goalsBalance).toEqual(new Prisma.Decimal(1200));
      expect(summary.netWorth).toEqual(new Prisma.Decimal(5200));
      expect(summary.monthlyIncome).toEqual(new Prisma.Decimal(5000));
      expect(summary.monthlyExpense).toEqual(new Prisma.Decimal(3200));
      expect(summary.netBalance).toEqual(new Prisma.Decimal(1800));
      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
      expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
      expect(prisma.creditCardInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [InvoiceStatus.OPEN, InvoiceStatus.CLOSED, InvoiceStatus.OVERDUE] },
            creditCard: expect.objectContaining({
              deletedAt: null,
            }),
          }),
        }),
      );
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('exportCsv', () => {
    it('should generate valid CSV text from transactions filtering deletedAt null', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          transactionDate: new Date('2026-09-01'),
          type: 'EXPENSE',
          description: 'Supermercado',
          category: { name: 'Alimentação' },
          account: { name: 'Nubank' },
          creditCard: null,
          amount: new Prisma.Decimal(150.50),
          status: 'COMPLETED',
          user: { name: 'João Silva' },
          notes: 'Compras do mês',
          isPrivate: false,
        },
      ]);

      const csv = await service.exportCsv('user-1');
      expect(csv).toContain('Supermercado');
      expect(csv).toContain('Alimentação');
      expect(csv).toContain('150.5');
      expect(csv).toContain('Tags');
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });

    it('should filter exportCsv by tagId and include tag names in CSV output', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-2',
          transactionDate: new Date('2026-09-02'),
          type: 'EXPENSE',
          description: 'Hospedagem',
          category: { name: 'Viagem' },
          account: { name: 'Nubank' },
          creditCard: null,
          amount: new Prisma.Decimal(800),
          status: 'COMPLETED',
          user: { name: 'João Silva' },
          notes: '',
          isPrivate: false,
          tags: [
            { tag: { id: 'tag-1', name: 'ferias' } },
            { tag: { id: 'tag-2', name: 'praia' } },
          ],
        },
      ]);

      const csv = await service.exportCsv('user-1', undefined, undefined, undefined, 'tag-1');
      expect(csv).toContain('Hospedagem');
      expect(csv).toContain('"ferias, praia"');
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
    });
  });

  describe('getExpensesByTag', () => {
    it('should aggregate expenses by tag and calculate correct percentages', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          amount: new Prisma.Decimal(300),
          isPrivate: false,
          userId: 'user-1',
          tags: [{ tag: { id: 't-1', name: 'viagem', color: '#10b981' } }],
        },
        {
          id: 'tx-2',
          amount: new Prisma.Decimal(100),
          isPrivate: false,
          userId: 'user-1',
          tags: [{ tag: { id: 't-2', name: 'trabalho', color: '#3b82f6' } }],
        },
      ]);

      const result = await service.getExpensesByTag('user-1', undefined, '2026-09');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        tagId: 't-1',
        name: 'viagem',
        color: '#10b981',
        amount: new Prisma.Decimal(300),
        percentage: 75,
      });
      expect(result[1]).toEqual({
        tagId: 't-2',
        name: 'trabalho',
        color: '#3b82f6',
        amount: new Prisma.Decimal(100),
        percentage: 25,
      });
    });
  });

  describe('getCashFlow and getExpensesByCategory with tagId', () => {
    it('should pass tagFilter into getCashFlow queries', async () => {
      prisma.transaction.aggregate
        .mockResolvedValue({ _sum: { amount: new Prisma.Decimal(100) } });

      const flow = await service.getCashFlow('user-1', undefined, 1, 'tag-viagem');

      expect(flow).toHaveLength(1);
      expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: {
              some: {
                OR: [
                  { tagId: 'tag-viagem' },
                  { tag: { name: { equals: 'tag-viagem', mode: 'insensitive' } } },
                ],
              },
            },
          }),
        }),
      );
    });

    it('should pass tagFilter into getExpensesByCategory query', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-cat',
          amount: new Prisma.Decimal(200),
          category: { id: 'c-1', name: 'Lazer', color: '#ec4899' },
          isPrivate: false,
        },
      ]);

      const result = await service.getExpensesByCategory('user-1', undefined, '2026-09', 'tag-1');

      expect(result).toHaveLength(1);
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
    });
  });
});
