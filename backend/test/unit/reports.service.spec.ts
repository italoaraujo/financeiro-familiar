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

      prisma.creditCardInvoice.findMany.mockResolvedValue([]);
      prisma.transaction.findMany.mockResolvedValue([]);

      const summary = await service.getDashboardSummary('user-1', undefined, '2026-09');

      expect(summary.totalBalance).toEqual(new Prisma.Decimal(4000));
      expect(summary.monthlyIncome).toEqual(new Prisma.Decimal(5000));
      expect(summary.monthlyExpense).toEqual(new Prisma.Decimal(3200));
      expect(summary.netBalance).toEqual(new Prisma.Decimal(1800));
      expect(prisma.creditCardInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [InvoiceStatus.OPEN, InvoiceStatus.CLOSED, InvoiceStatus.OVERDUE] },
          }),
        }),
      );
    });
  });

  describe('exportCsv', () => {
    it('should generate valid CSV text from transactions', async () => {
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
    });
  });
});
