import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TransactionType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      category: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: {
        findFirst: jest.fn(),
      },
      familyMember: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('create', () => {
    it('should create custom category', async () => {
      prisma.category.create.mockResolvedValue({
        id: 'cat-1',
        name: 'Supermercado',
        type: TransactionType.EXPENSE,
        isSystemDefault: false,
      });

      const result = await service.create('user-1', {
        name: 'Supermercado',
        type: TransactionType.EXPENSE,
      });

      expect(result.id).toBe('cat-1');
      expect(prisma.category.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should filter deletedAt: null for root and subcategories', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'cat-1',
          name: 'Alimentação',
          subcategories: [],
        },
      ]);

      const result = await service.findAll('user-1');

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          parentId: null,
          deletedAt: null,
          OR: [{ isSystemDefault: true }, { userId: 'user-1' }],
        },
        include: {
          subcategories: {
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if category is soft deleted', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        deletedAt: new Date(),
      });

      await expect(service.findById('cat-1')).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should reject deleting system default category', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-default',
        isSystemDefault: true,
        deletedAt: null,
      });

      await expect(service.remove('user-1', 'cat-default')).rejects.toThrow(BadRequestException);
    });

    it('should reject deleting category with active transactions', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-custom',
        userId: 'user-1',
        isSystemDefault: false,
        deletedAt: null,
      });
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1' });

      await expect(service.remove('user-1', 'cat-custom')).rejects.toThrow(BadRequestException);
      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { categoryId: 'cat-custom', deletedAt: null },
      });
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('should soft delete category when it has no active transactions', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-custom',
        userId: 'user-1',
        isSystemDefault: false,
        deletedAt: null,
      });
      prisma.transaction.findFirst.mockResolvedValue(null);
      prisma.category.update.mockResolvedValue({ id: 'cat-custom' });

      const result = await service.remove('user-1', 'cat-custom');

      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { categoryId: 'cat-custom', deletedAt: null },
      });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-custom' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.message).toContain('removida com sucesso');
    });
  });
});
