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
});
