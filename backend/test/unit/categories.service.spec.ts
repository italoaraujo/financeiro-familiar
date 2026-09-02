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

  describe('remove', () => {
    it('should reject deleting system default category', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-default',
        isSystemDefault: true,
      });

      await expect(service.remove('user-1', 'cat-default')).rejects.toThrow(BadRequestException);
    });

    it('should reject deleting category with existing transactions', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-custom',
        userId: 'user-1',
        isSystemDefault: false,
      });
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1' });

      await expect(service.remove('user-1', 'cat-custom')).rejects.toThrow(BadRequestException);
    });
  });
});
