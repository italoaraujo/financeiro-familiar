import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from '../../src/modules/goals/goals.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { GoalStatus, Prisma } from '@prisma/client';

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
    it('should create a goal with initial currentAmount 0 and IN_PROGRESS status', async () => {
      prisma.goal.create.mockResolvedValue({
        id: 'goal-1',
        name: 'Reserva',
        targetAmount: new Prisma.Decimal(10000),
        currentAmount: new Prisma.Decimal(0),
        status: GoalStatus.IN_PROGRESS,
      });

      const result = await service.create('user-1', {
        name: 'Reserva',
        targetAmount: 10000,
      });

      expect(result.id).toBe('goal-1');
      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          familyId: null,
          name: 'Reserva',
        }),
      });
    });

    it('should verify family access and create goal with familyId and userId', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        familyId: 'family-1',
        userId: 'user-1',
      });

      prisma.goal.create.mockResolvedValue({
        id: 'goal-2',
        userId: 'user-1',
        familyId: 'family-1',
        name: 'Viagem',
        targetAmount: new Prisma.Decimal(5000),
        currentAmount: new Prisma.Decimal(0),
        status: GoalStatus.IN_PROGRESS,
      });

      const result = await service.create('user-1', {
        name: 'Viagem',
        targetAmount: 5000,
        familyId: 'family-1',
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
        }),
      });
    });
  });

  describe('addDeposit', () => {
    it('should add deposit, update currentAmount and status if target reached', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        name: 'Reserva',
        userId: 'user-1',
        targetAmount: new Prisma.Decimal(1000),
        currentAmount: new Prisma.Decimal(800),
        status: GoalStatus.IN_PROGRESS,
      });

      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        currentBalance: new Prisma.Decimal(2000),
      });

      prisma.category.findFirst.mockResolvedValue({ id: 'cat-goal' });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-goal' });
      prisma.goalDeposit.create.mockResolvedValue({ id: 'dep-1' });
      prisma.account.update.mockResolvedValue({ id: 'acc-1' });
      prisma.goal.update.mockResolvedValue({ id: 'goal-1', status: GoalStatus.COMPLETED });

      const result = await service.addDeposit('user-1', 'goal-1', {
        amount: 250, // 800 + 250 = 1050 >= 1000 -> COMPLETED
        depositDate: '2026-09-01',
        accountId: 'acc-1',
      });

      expect(result.id).toBe('dep-1');
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
  });

  describe('findAll', () => {
    it('should filter deletedAt: null in goal query', async () => {
      prisma.goal.findMany.mockResolvedValue([
        {
          id: 'goal-1',
          name: 'Viagem',
          targetAmount: new Prisma.Decimal(5000),
          currentAmount: new Prisma.Decimal(1000),
          deposits: [],
        },
      ]);

      const result = await service.findAll('user-1');

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        include: {
          deposits: {
            orderBy: { depositDate: 'desc' },
            take: 5,
          },
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

      await expect(service.findById('user-1', 'goal-1')).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should soft delete goal by setting deletedAt', async () => {
      prisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
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
});
