import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto) {
    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId);
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Categoria pai não encontrada');
      }
    }

    return this.prisma.category.create({
      data: {
        userId: dto.familyId ? null : userId,
        familyId: dto.familyId || null,
        parentId: dto.parentId || null,
        name: dto.name,
        type: dto.type,
        icon: dto.icon || 'Tag',
        color: dto.color || '#64748b',
        isSystemDefault: false,
      },
    });
  }

  async findAll(userId: string, familyId?: string, type?: TransactionType) {
    const whereCondition: any = {
      parentId: null, // Categorias raiz
      OR: [
        { isSystemDefault: true },
        { userId },
      ],
    };

    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId);
      whereCondition.OR.push({ familyId });
    }

    if (type) {
      whereCondition.type = type;
    }

    return this.prisma.category.findMany({
      where: whereCondition,
      include: {
        subcategories: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: true,
        parent: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findById(id);

    if (category.isSystemDefault) {
      throw new BadRequestException('Não é permitido alterar categorias padrão do sistema');
    }

    if (category.userId && category.userId !== userId) {
      throw new ForbiddenException('Acesso negado para modificar esta categoria');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        parentId: dto.parentId !== undefined ? dto.parentId : category.parentId,
      },
    });
  }

  async remove(userId: string, id: string) {
    const category = await this.findById(id);

    if (category.isSystemDefault) {
      throw new BadRequestException('Não é permitido excluir categorias padrão do sistema');
    }

    if (category.userId && category.userId !== userId) {
      throw new ForbiddenException('Acesso negado para excluir esta categoria');
    }

    const hasTransactions = await this.prisma.transaction.findFirst({
      where: { categoryId: id },
    });

    if (hasTransactions) {
      throw new BadRequestException(
        'Não é possível excluir uma categoria vinculada a transações. Reclassifique os lançamentos antes de excluir.',
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: 'Categoria removida com sucesso' };
  }

  private async verifyFamilyAccess(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Acesso negado à família especificada');
    }
  }
}
