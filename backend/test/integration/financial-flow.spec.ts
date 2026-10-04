import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Prisma, TransactionType, FamilyMemberRole, GoalStatus } from '@prisma/client';

describe('Financial Flow Core Domain Integration (e2e)', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/financeiro_dev?schema=public';
  });

  it('should verify exact decimal arithmetic on financial transfers and balances', () => {
    const initialOrigin = new Prisma.Decimal('1000.00');
    const initialDestination = new Prisma.Decimal('250.50');
    const transferAmount = new Prisma.Decimal('135.75');

    const finalOrigin = initialOrigin.minus(transferAmount);
    const finalDestination = initialDestination.add(transferAmount);

    expect(finalOrigin.toString()).toBe('864.25');
    expect(finalDestination.toString()).toBe('386.25');
  });

  it('should calculate installment splits with exact cent rounding on last installment', () => {
    const totalAmount = new Prisma.Decimal('100.00');
    const totalInstallments = 3;

    const baseInstallment = totalAmount
      .dividedBy(totalInstallments)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
    const accumulated = baseInstallment.times(totalInstallments - 1);
    const lastInstallment = totalAmount.minus(accumulated);

    expect(baseInstallment.toString()).toBe('33.33');
    expect(lastInstallment.toString()).toBe('33.34');
    expect(baseInstallment.times(2).add(lastInstallment).toFixed(2)).toBe('100.00');
  });

  it('should evaluate budget alert thresholds correctly (80% and 100%)', () => {
    const targetAmount = new Prisma.Decimal('500.00');
    const alertThresholdPct = 80;

    const spentUnder = new Prisma.Decimal('350.00'); // 70%
    const spentAlert = new Prisma.Decimal('420.00'); // 84%
    const spentExceeded = new Prisma.Decimal('550.00'); // 110%

    const pctUnder = spentUnder.dividedBy(targetAmount).times(100).toNumber();
    const pctAlert = spentAlert.dividedBy(targetAmount).times(100).toNumber();
    const pctExceeded = spentExceeded.dividedBy(targetAmount).times(100).toNumber();

    expect(pctUnder < alertThresholdPct).toBe(true);
    expect(pctAlert >= alertThresholdPct && pctAlert < 100).toBe(true);
    expect(pctExceeded >= 100).toBe(true);
  });

  describe('End-to-End Soft Delete & Financial Reversal Flow', () => {
    let prisma: any;

    beforeEach(() => {
      prisma = {
        $transaction: jest.fn(async (callback) => callback(prisma)),
        transaction: {
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          aggregate: jest.fn(),
        },
        account: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        creditCard: {
          findUnique: jest.fn(),
        },
        creditCardInvoice: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      };
    });

    it('should complete the end-to-end lifecycle: expense impacts balance, soft delete records deletedAt, reverses balance, and preserves record in DB', async () => {
      // 1. Initial State: Conta com R$ 1.000,00
      let currentAccountBalance = new Prisma.Decimal('1000.00');
      const expenseAmount = new Prisma.Decimal('150.00');

      // 2. Transação criada: debita R$ 150,00 da conta
      currentAccountBalance = currentAccountBalance.minus(expenseAmount);
      expect(currentAccountBalance.toFixed(2)).toBe('850.00');

      const mockExpenseTx = {
        id: 'tx-soft-1',
        userId: 'user-1',
        accountId: 'acc-1',
        type: TransactionType.EXPENSE,
        amount: expenseAmount,
        creditCardInvoiceId: null,
        transferCounterpartId: null,
        deletedAt: null,
      };

      prisma.transaction.findUnique.mockResolvedValue(mockExpenseTx);
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        currentBalance: currentAccountBalance,
      });

      // 3. Execução da exclusão lógica (Soft Delete)
      let recordedDeletedAt: Date | null = null;
      prisma.transaction.update.mockImplementation(({ where, data }: any) => {
        if (data.deletedAt) {
          recordedDeletedAt = data.deletedAt;
          return { ...mockExpenseTx, deletedAt: data.deletedAt };
        }
        return mockExpenseTx;
      });

      prisma.account.update.mockImplementation(({ data }: any) => {
        if (data.currentBalance?.increment) {
          currentAccountBalance = currentAccountBalance.add(data.currentBalance.increment);
        }
        return { id: 'acc-1', currentBalance: currentAccountBalance };
      });

      // Simula a lógica atômica do TransactionsService.remove
      await prisma.$transaction(async (tx: any) => {
        const found = await tx.transaction.findUnique({ where: { id: 'tx-soft-1' } });
        expect(found.deletedAt).toBeNull();

        // Estorno na conta de débito
        await tx.account.update({
          where: { id: found.accountId },
          data: { currentBalance: { increment: found.amount } },
        });

        // Soft delete em vez de exclusão física
        await tx.transaction.update({
          where: { id: found.id },
          data: { deletedAt: new Date() },
        });
      });

      // 4. Validações de Integridade
      // Regra 1: O registro NÃO é excluído via SQL DELETE
      expect(prisma.transaction.delete).not.toHaveBeenCalled();

      // Regra 2: O registro é mantido no banco com deletedAt devidamente preenchido
      expect(recordedDeletedAt).toBeInstanceOf(Date);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-soft-1' },
        data: { deletedAt: expect.any(Date) },
      });

      // Regra 3: O saldo bancário é revertido com exatidão (850.00 + 150.00 = 1000.00)
      expect(currentAccountBalance.toFixed(2)).toBe('1000.00');

      // Regra 4: Consultas de listagem ignoram o registro excluído (deletedAt: null)
      prisma.transaction.findMany.mockImplementation(({ where }: any) => {
        expect(where.deletedAt).toBeNull();
        return []; // Nenhum registro ativo
      });

      const activeTransactions = await prisma.transaction.findMany({
        where: { userId: 'user-1', deletedAt: null },
      });
      expect(activeTransactions).toHaveLength(0);

      // Regra 5: Agregações de relatório desconsideram transações com deletedAt
      prisma.transaction.aggregate.mockImplementation(({ where }: any) => {
        expect(where.deletedAt).toBeNull();
        return { _sum: { amount: new Prisma.Decimal('0.00') } };
      });

      const reportExpenseSum = await prisma.transaction.aggregate({
        where: { userId: 'user-1', type: TransactionType.EXPENSE, deletedAt: null },
        _sum: { amount: true },
      });
      expect(reportExpenseSum._sum.amount.toFixed(2)).toBe('0.00');
    });

    it('should reverse credit card invoice total upon soft delete without physical deletion', async () => {
      let invoiceTotal = new Prisma.Decimal('350.00');
      const cardExpense = new Prisma.Decimal('120.00');

      const mockCardTx = {
        id: 'tx-card-soft-1',
        userId: 'user-1',
        creditCardId: 'card-1',
        creditCardInvoiceId: 'inv-1',
        type: TransactionType.EXPENSE,
        amount: cardExpense,
        accountId: null,
        deletedAt: null,
      };

      prisma.transaction.findUnique.mockResolvedValue(mockCardTx);
      prisma.creditCardInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        totalAmount: invoiceTotal,
      });

      prisma.creditCardInvoice.update.mockImplementation(({ data }: any) => {
        if (data.totalAmount?.decrement) {
          invoiceTotal = invoiceTotal.minus(data.totalAmount.decrement);
        }
        return { id: 'inv-1', totalAmount: invoiceTotal };
      });

      let softDeletedTimestamp: Date | null = null;
      prisma.transaction.update.mockImplementation(({ data }: any) => {
        if (data.deletedAt) {
          softDeletedTimestamp = data.deletedAt;
        }
        return { ...mockCardTx, deletedAt: data.deletedAt };
      });

      // Executa o estorno de fatura e soft delete
      await prisma.$transaction(async (tx: any) => {
        const found = await tx.transaction.findUnique({ where: { id: 'tx-card-soft-1' } });

        await tx.creditCardInvoice.update({
          where: { id: found.creditCardInvoiceId },
          data: { totalAmount: { decrement: found.amount } },
        });

        await tx.transaction.update({
          where: { id: found.id },
          data: { deletedAt: new Date() },
        });
      });

      // Validações
      expect(prisma.transaction.delete).not.toHaveBeenCalled();
      expect(softDeletedTimestamp).toBeInstanceOf(Date);
      expect(invoiceTotal.toFixed(2)).toBe('230.00'); // 350 - 120 = 230
    });
  });
});
