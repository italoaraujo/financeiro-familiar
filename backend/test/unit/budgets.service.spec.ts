import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from '../../src/modules/budgets/budgets.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      budget: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: {
        aggregate: jest.fn(),
      },
      familyMember: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  describe('create', () => {
    it('should create budget for a category and month', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);
      prisma.budget.create.mockResolvedValue({
        id: 'budget-1',
        categoryId: 'cat-1',
        periodMonth: '2026-09',
        targetAmount: new Prisma.Decimal(500),
        alertPercentage: 80,
      });

      const result = await service.create('user-1', {
        categoryId: 'cat-1',
        periodMonth: '2026-09',
        targetAmount: 500,
        alertPercentage: 80,
      });

      expect(result.id).toBe('budget-1');
      expect(prisma.budget.create).toHaveBeenCalled();
    });

    it('should reject creating duplicate budget for same category and month', async () => {
      prisma.budget.findFirst.mockResolvedValue({ id: 'existing-budget' });

      await expect(
        service.create('user-1', {
          categoryId: 'cat-1',
          periodMonth: '2026-09',
          targetAmount: 500,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll with consumption and alerts', () => {
    it('should calculate consumption percentage and trigger alert when >= alertPercentage', async () => {
      prisma.budget.findMany.mockResolvedValue([
        {
          id: 'b-1',
          categoryId: 'cat-alimentacao',
          periodMonth: '2026-09',
          targetAmount: new Prisma.Decimal(500),
          alertPercentage: 80,
          category: { name: 'Alimentação' },
        },
      ]);

      prisma.transaction.aggregate.mockResolvedValue({
        _sum: {
          amount: new Prisma.Decimal(420), // 84% de 500 -> dispara alerta!
        },
      });

      const results = await service.findAll('user-1', '2026-09');

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: {
          periodMonth: '2026-09',
          deletedAt: null,
          userId: 'user-1',
        },
        include: {
          category: true,
        },
      });
      expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
        where: {
          categoryId: 'cat-alimentacao',
          type: 'EXPENSE',
          status: 'COMPLETED',
          deletedAt: null,
          transactionDate: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          userId: 'user-1',
        },
        _sum: {
          amount: true,
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0].percentage).toBe(84);
      expect(results[0].isAlert).toBe(true);
      expect(results[0].isExceeded).toBe(false);
    });
  });

  describe('remove', () => {
    it('should soft delete budget setting deletedAt', async () => {
      prisma.budget.findUnique.mockResolvedValue({
        id: 'b-1',
        userId: 'user-1',
        deletedAt: null,
      });
      prisma.budget.update.mockResolvedValue({ id: 'b-1' });

      const result = await service.remove('user-1', 'b-1');

      expect(prisma.budget.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.message).toContain('removido com sucesso');
    });

    it('should throw NotFoundException if budget is already deleted', async () => {
      prisma.budget.findUnique.mockResolvedValue({
        id: 'b-1',
        userId: 'user-1',
        deletedAt: new Date(),
      });

      await expect(service.remove('user-1', 'b-1')).rejects.toThrow();
    });
  });
});
