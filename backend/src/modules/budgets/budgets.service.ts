import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBudgetDto) {
    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId);
    }

    const existing = await this.prisma.budget.findFirst({
      where: {
        categoryId: dto.categoryId,
        periodMonth: dto.periodMonth,
        ...(dto.familyId ? { familyId: dto.familyId } : { userId }),
      },
    });

    if (existing) {
      throw new BadRequestException('Já existe um orçamento configurado para esta categoria e mês');
    }

    return this.prisma.budget.create({
      data: {
        userId: dto.familyId ? null : userId,
        familyId: dto.familyId || null,
        categoryId: dto.categoryId,
        periodMonth: dto.periodMonth,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        alertPercentage: dto.alertPercentage || 80,
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(userId: string, periodMonth?: string, familyId?: string) {
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId);
    }

    const now = new Date();
    const month = periodMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const budgets = await this.prisma.budget.findMany({
      where: {
        periodMonth: month,
        ...(familyId ? { familyId } : { userId }),
      },
      include: {
        category: true,
      },
    });

    // Calcula gastos reais de cada categoria no mês
    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59);

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const expenses = await this.prisma.transaction.aggregate({
          where: {
            categoryId: budget.categoryId,
            type: TransactionType.EXPENSE,
            status: TransactionStatus.COMPLETED,
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
            ...(familyId ? { familyId } : { userId }),
          },
          _sum: {
            amount: true,
          },
        });

        const spent = expenses._sum.amount || new Prisma.Decimal(0);
        const target = budget.targetAmount;
        const percentage = target.gt(0)
          ? spent.dividedBy(target).times(100).toNumber()
          : 0;

        const isAlert = percentage >= budget.alertPercentage;
        const isExceeded = percentage >= 100;

        return {
          ...budget,
          spentAmount: spent,
          remainingAmount: Prisma.Decimal.max(0, target.minus(spent)),
          percentage: Number(percentage.toFixed(1)),
          isAlert,
          isExceeded,
        };
      }),
    );

    return budgetsWithSpent;
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
    });

    if (!budget) {
      throw new NotFoundException('Orçamento não encontrado');
    }

    if (budget.userId && budget.userId !== userId) {
      throw new ForbiddenException('Acesso negado ao orçamento');
    }

    return this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.targetAmount !== undefined && { targetAmount: new Prisma.Decimal(dto.targetAmount) }),
        ...(dto.alertPercentage !== undefined && { alertPercentage: dto.alertPercentage }),
      },
      include: {
        category: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
    });

    if (!budget) {
      throw new NotFoundException('Orçamento não encontrado');
    }

    if (budget.userId && budget.userId !== userId) {
      throw new ForbiddenException('Acesso negado ao orçamento');
    }

    await this.prisma.budget.delete({
      where: { id },
    });

    return { message: 'Orçamento removido com sucesso' };
  }

  private async verifyFamilyAccess(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Acesso negado ao grupo familiar');
    }
  }
}
