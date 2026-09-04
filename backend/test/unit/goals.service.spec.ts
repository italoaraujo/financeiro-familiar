import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from '../../src/modules/goals/goals.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { GoalMovementType, GoalStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('GoalsService', () => {
  let service: GoalsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      goal: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      goalDeposit: {
        create: jest.fn(),
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
        GoalsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
  });

  describe('create', () => {
    it('should create a goal linked to an account with initial currentAmount 0 and IN_PROGRESS status', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
        familyId: null,
        deletedAt: null,
      });

      prisma.goal.create.mockResolvedValue({
        id: 'goal-1',
        accountId: 'acc-1',
        name: 'Reserva',
        targetAmount: new Prisma.Decimal(10000),
        currentAmount: new Prisma.Decimal(0),
        status: GoalStatus.IN_PROGRESS,
      });

      const result = await service.create('user-1', {
        name: 'Reserva',
        targetAmount: 10000,
        accountId: 'acc-1',
      });

      expect(result.id).toBe('goal-1');
      expect(prisma.account.findUnique).toHaveBeenCalledWith({ where: { id: 'acc-1' } });
      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          familyId: null,
          accountId: 'acc-1',
          name: 'Reserva',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if linked account does not exist or is deleted', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          name: 'Reserva',
          targetAmount: 10000,
          accountId: 'acc-non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify family access and create goal with familyId, accountId and userId', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        familyId: 'family-1',
        userId: 'user-1',
      });

      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-fam-1',
        userId: 'user-1',
        familyId: 'family-1',
        deletedAt: null,
      });

      prisma.goal.create.mockResolvedValue({
        id: 'goal-2',
        userId: 'user-1',
        familyId: 'family-1',
        accountId: 'acc-fam-1',
        name: 'Viagem',
        targetAmount: new Prisma.Decimal(5000),
        currentAmount: new Prisma.Decimal(0),
        status: GoalStatus.IN_PROGRESS,
      });

      const result = await service.create('user-1', {
        name: 'Viagem',
        targetAmount: 5000,
        familyId: 'family-1',
        accountId: 'acc-fam-1',
      });

      expect(result.id).toBe('goal-2');
      expect(prisma.familyMember.findUnique).toHaveBeenCalledWith({
        where: {
          familyId_userId: { familyId: 'family-1', userId: 'user-1' },
        },
      });
      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          familyId: 'family-1',
          accountId: 'acc-fam-1',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('addDeposit', () => {
    it('should add deposit, update currentAmount and set COMPLETED status when target reached', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        name: 'Reserva',
        userId: 'user-1',
        familyId: null,
        accountId: 'acc-1',
        targetAmount: new Prisma.Decimal(1000),
        currentAmount: new Prisma.Decimal(800),
        status: GoalStatus.IN_PROGRESS,
      });

      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        currentBalance: new Prisma.Decimal(2000),
        deletedAt: null,
      });

      prisma.category.findFirst.mockResolvedValue({ id: 'cat-goal' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-goal' });
      prisma.goalDeposit.create.mockResolvedValue({ id: 'dep-1' });
      prisma.account.update.mockResolvedValue({ id: 'acc-1' });
      prisma.goal.update.mockResolvedValue({ id: 'goal-1', status: GoalStatus.COMPLETED });

      const result = await service.addDeposit('user-1', 'goal-1', {
        amount: 250, // 800 + 250 = 1050 >= 1000 -> COMPLETED
        depositDate: '2026-09-01',
      });

      expect(result.id).toBe('dep-1');
      expect(prisma.goalDeposit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          goalId: 'goal-1',
          type: GoalMovementType.DEPOSIT,
          amount: new Prisma.Decimal(250),
        }),
      });
      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: {
          currentAmount: new Prisma.Decimal(1050),
          status: GoalStatus.COMPLETED,
        },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { currentBalance: { decrement: new Prisma.Decimal(250) } },
      });
    });

    it('should reject deposit with amount <= 0', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
        deletedAt: null,
      });

      await expect(
        service.addDeposit('user-1', 'goal-1', {
          amount: 0,
          depositDate: '2026-09-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('withdraw', () => {
    it('should execute atomic withdrawal, credit account balance, debit goal, and record movement', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        name: 'Reserva Emergência',
        userId: 'user-1',
        familyId: null,
        accountId: 'acc-1',
        targetAmount: new Prisma.Decimal(5000),
        currentAmount: new Prisma.Decimal(2000),
        status: GoalStatus.IN_PROGRESS,
        deletedAt: null,
      });

      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        name: 'Nubank',
        currentBalance: new Prisma.Decimal(1000),
        deletedAt: null,
      });

      prisma.category.findFirst.mockResolvedValue({ id: 'cat-resgate' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-resgate' });
      prisma.account.update.mockResolvedValue({ id: 'acc-1' });
      prisma.goalDeposit.create.mockResolvedValue({
        id: 'mov-1',
        type: GoalMovementType.WITHDRAWAL,
        amount: new Prisma.Decimal(500),
      });
      prisma.goal.update.mockResolvedValue({ id: 'goal-1' });

      const result = await service.withdraw('user-1', 'goal-1', {
        amount: 500,
        withdrawalDate: '2026-09-04',
        notes: 'Resgate para despesa',
      });

      expect(result.id).toBe('mov-1');
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { currentBalance: { increment: new Prisma.Decimal(500) } },
      });
      expect(prisma.goalDeposit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          goalId: 'goal-1',
          transactionId: 'tx-resgate',
          type: GoalMovementType.WITHDRAWAL,
          amount: new Prisma.Decimal(500),
        }),
      });
      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: {
          currentAmount: new Prisma.Decimal(1500),
          status: GoalStatus.IN_PROGRESS,
        },
      });
    });

    it('should revert status to IN_PROGRESS if withdrawal drops balance below targetAmount', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        name: 'Carro',
        userId: 'user-1',
        familyId: null,
        accountId: 'acc-1',
        targetAmount: new Prisma.Decimal(10000),
        currentAmount: new Prisma.Decimal(10000),
        status: GoalStatus.COMPLETED,
        deletedAt: null,
      });

      prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', deletedAt: null });
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-resgate' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-resgate' });
      prisma.account.update.mockResolvedValue({ id: 'acc-1' });
      prisma.goalDeposit.create.mockResolvedValue({ id: 'mov-1' });
      prisma.goal.update.mockResolvedValue({ id: 'goal-1' });

      await service.withdraw('user-1', 'goal-1', {
        amount: 1000,
        withdrawalDate: '2026-09-04',
      });

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: {
          currentAmount: new Prisma.Decimal(9000),
          status: GoalStatus.IN_PROGRESS,
        },
      });
    });

    it('should throw BadRequestException if withdrawal amount exceeds currentAmount', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
        currentAmount: new Prisma.Decimal(500),
        deletedAt: null,
      });

      await expect(
        service.withdraw('user-1', 'goal-1', {
          amount: 600,
          withdrawalDate: '2026-09-04',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if withdrawal amount is <= 0', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
        currentAmount: new Prisma.Decimal(500),
        deletedAt: null,
      });

      await expect(
        service.withdraw('user-1', 'goal-1', {
          amount: -50,
          withdrawalDate: '2026-09-04',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException when trying to delete a goal with currentAmount > 0', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
        currentAmount: new Prisma.Decimal(350.50),
        deletedAt: null,
      });

      await expect(service.remove('user-1', 'goal-1')).rejects.toThrow(BadRequestException);
      expect(prisma.goal.update).not.toHaveBeenCalled();
    });

    it('should allow soft delete when currentAmount is exactly zero', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
        currentAmount: new Prisma.Decimal(0),
        deletedAt: null,
      });
      prisma.goal.update.mockResolvedValue({ id: 'goal-1' });

      const result = await service.remove('user-1', 'goal-1');

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.message).toContain('removida com sucesso');
    });
  });

  describe('findAll', () => {
    it('should filter deletedAt: null and include account relation in goal query', async () => {
      prisma.goal.findMany.mockResolvedValue([
        {
          id: 'goal-1',
          name: 'Viagem',
          targetAmount: new Prisma.Decimal(5000),
          currentAmount: new Prisma.Decimal(1000),
          account: { id: 'acc-1', name: 'Nubank' },
          deposits: [],
        },
      ]);

      const result = await service.findAll('user-1');

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        include: {
          account: expect.any(Object),
          deposits: expect.any(Object),
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if goal has deletedAt', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
        deletedAt: new Date(),
        deposits: [],
      });

      await expect(service.findById('user-1', 'goal-1')).rejects.toThrow(NotFoundException);
    });
  });
});
