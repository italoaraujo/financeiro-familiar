import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TransactionType } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

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

    it('should throw NotFoundException if parentId does not exist (SEC-HIGH-02)', async () => {
      prisma.category.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create('user-1', {
          name: 'Hortifruti',
          type: TransactionType.EXPENSE,
          parentId: 'cat-non-existent',
        }),
      ).rejects.toThrow(new NotFoundException('Categoria pai não encontrada'));
    });

    it('should throw NotFoundException if parentId is soft-deleted (SEC-HIGH-02)', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-del',
        deletedAt: new Date(),
        isSystemDefault: false,
      });

      await expect(
        service.create('user-1', {
          name: 'Hortifruti',
          type: TransactionType.EXPENSE,
          parentId: 'cat-del',
        }),
      ).rejects.toThrow(new NotFoundException('Categoria pai não encontrada'));
    });

    it('should throw ForbiddenException if parentId belongs to another user (SEC-HIGH-02)', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-other-user',
        deletedAt: null,
        userId: 'other-user',
        familyId: null,
        isSystemDefault: false,
      });

      await expect(
        service.create('user-1', {
          name: 'Hortifruti',
          type: TransactionType.EXPENSE,
          parentId: 'cat-other-user',
        }),
      ).rejects.toThrow(new ForbiddenException('A categoria pai não pertence ao seu escopo pessoal'));
    });

    it('should throw ForbiddenException if parentId belongs to another family (SEC-HIGH-02)', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-other-fam',
        deletedAt: null,
        userId: 'user-1',
        familyId: 'family-other',
        isSystemDefault: false,
      });

      prisma.familyMember.findUnique.mockResolvedValueOnce({
        id: 'fm-1',
        userId: 'user-1',
        familyId: 'family-1',
        role: 'ADMIN',
      });

      await expect(
        service.create('user-1', {
          name: 'Hortifruti Familiar',
          type: TransactionType.EXPENSE,
          familyId: 'family-1',
          parentId: 'cat-other-fam',
        }),
      ).rejects.toThrow(new ForbiddenException('A categoria pai não pertence a este grupo familiar'));
    });

    it('should create subcategory when parentId is system default or owned by user (SEC-HIGH-02)', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-sys-def',
        deletedAt: null,
        isSystemDefault: true,
      });

      prisma.category.create.mockResolvedValueOnce({
        id: 'cat-sub-ok',
        name: 'Hortifruti',
        parentId: 'cat-sys-def',
      });

      const result = await service.create('user-1', {
        name: 'Hortifruti',
        type: TransactionType.EXPENSE,
        parentId: 'cat-sys-def',
      });

      expect(result.id).toBe('cat-sub-ok');
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
          OR: [{ isSystemDefault: true }, { userId: 'user-1', familyId: null }],
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

      await expect(service.findById('cat-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if category is personal and belongs to another user', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-private',
        userId: 'other-user',
        familyId: null,
        isSystemDefault: false,
        deletedAt: null,
      });

      await expect(service.findById('cat-private', 'user-1')).rejects.toThrow(
        new ForbiddenException('Acesso negado à categoria especificada'),
      );
    });

    it('should return category if category belongs to the requesting user', async () => {
      const personalCat = {
        id: 'cat-mine',
        userId: 'user-1',
        familyId: null,
        isSystemDefault: false,
        deletedAt: null,
      };
      prisma.category.findUnique.mockResolvedValue(personalCat);

      const result = await service.findById('cat-mine', 'user-1');
      expect(result).toEqual(personalCat);
    });

    it('should return category if category is system default', async () => {
      const defaultCat = {
        id: 'cat-default',
        userId: null,
        familyId: null,
        isSystemDefault: true,
        deletedAt: null,
      };
      prisma.category.findUnique.mockResolvedValue(defaultCat);

      const result = await service.findById('cat-default', 'user-1');
      expect(result).toEqual(defaultCat);
    });

    it('should throw ForbiddenException if user has no access to the family category', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-family',
        userId: null,
        familyId: 'family-other',
        isSystemDefault: false,
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(service.findById('cat-family', 'user-1')).rejects.toThrow(
        new ForbiddenException('Acesso negado à família especificada'),
      );
    });

    it('should return category if user is a member of the family', async () => {
      const familyCat = {
        id: 'cat-family',
        userId: null,
        familyId: 'family-mine',
        isSystemDefault: false,
        deletedAt: null,
      };
      prisma.category.findUnique.mockResolvedValue(familyCat);
      prisma.familyMember.findUnique.mockResolvedValue({ role: 'MEMBER' });

      const result = await service.findById('cat-family', 'user-1');
      expect(result).toEqual(familyCat);
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

  describe('RBAC VIEWER permissions', () => {
    it('should throw ForbiddenException when VIEWER tries to create family category', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(
        service.create('user-viewer', {
          name: 'Categoria Familiar',
          type: TransactionType.EXPENSE,
          familyId: 'family-1',
        }),
      ).rejects.toThrow(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    });

    it('should throw ForbiddenException when VIEWER tries to update family category', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-fam-1',
        familyId: 'family-1',
        name: 'Categoria Familiar',
        type: TransactionType.EXPENSE,
        isSystemDefault: false,
        deletedAt: null,
      });
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });

      await expect(
        service.update('user-viewer', 'cat-fam-1', {
          name: 'Nome Atualizado',
        }),
      ).rejects.toThrow(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    });

    it('should allow VIEWER to query family categories via findAll', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-viewer',
        familyId: 'family-1',
        role: 'VIEWER',
      });
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'cat-fam-1',
          name: 'Categoria Familiar',
          familyId: 'family-1',
          subcategories: [],
        },
      ]);

      const result = await service.findAll('user-viewer', 'family-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('update parentId validation (SEC-HIGH-02)', () => {
    it('should throw BadRequestException if category is set as parent of itself', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        userId: 'user-1',
        familyId: null,
        isSystemDefault: false,
        deletedAt: null,
      });

      await expect(
        service.update('user-1', 'cat-1', { parentId: 'cat-1' }),
      ).rejects.toThrow(new BadRequestException('Uma categoria não pode ser definida como pai de si mesma'));
    });

    it('should throw ForbiddenException if updated parentId belongs to another user', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({
          id: 'cat-1',
          userId: 'user-1',
          familyId: null,
          isSystemDefault: false,
          deletedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'cat-other',
          userId: 'other-user',
          familyId: null,
          isSystemDefault: false,
          deletedAt: null,
        });

      await expect(
        service.update('user-1', 'cat-1', { parentId: 'cat-other' }),
      ).rejects.toThrow(new ForbiddenException('A categoria pai não pertence ao seu escopo pessoal'));
    });

    it('should update category when parentId is valid and owned by user', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({
          id: 'cat-1',
          userId: 'user-1',
          familyId: null,
          isSystemDefault: false,
          deletedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'cat-parent-ok',
          userId: 'user-1',
          familyId: null,
          isSystemDefault: false,
          deletedAt: null,
        });

      prisma.category.update.mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Categoria Atualizada',
        parentId: 'cat-parent-ok',
      });

      const result = await service.update('user-1', 'cat-1', {
        name: 'Categoria Atualizada',
        parentId: 'cat-parent-ok',
      });

      expect(result.id).toBe('cat-1');
      expect(result.parentId).toBe('cat-parent-ok');
    });
  });
});

