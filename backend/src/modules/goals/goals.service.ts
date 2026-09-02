import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto) {
    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId);
    }

    return this.prisma.goal.create({
      data: {
        userId,
        familyId: dto.familyId || null,
        name: dto.name,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        currentAmount: new Prisma.Decimal(0),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        status: GoalStatus.IN_PROGRESS,
        color: dto.color || '#10b981',
        icon: dto.icon || 'Target',
      },
    });
  }

  async findAll(userId: string, familyId?: string) {
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId);
    }

    const goals = await this.prisma.goal.findMany({
      where: familyId ? { familyId } : { userId },
      include: {
        deposits: {
          orderBy: { depositDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((goal) => {
      const percentage = goal.targetAmount.gt(0)
        ? goal.currentAmount.dividedBy(goal.targetAmount).times(100).toNumber()
        : 0;

      const remainingAmount = Prisma.Decimal.max(0, goal.targetAmount.minus(goal.currentAmount));

      return {
        ...goal,
        percentage: Number(percentage.toFixed(1)),
        remainingAmount,
      };
    });
  }

  async findById(userId: string, id: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: {
        deposits: {
          orderBy: { depositDate: 'desc' },
        },
      },
    });

    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }

    if (goal.userId !== userId && goal.familyId) {
      await this.verifyFamilyAccess(userId, goal.familyId);
    } else if (goal.userId !== userId) {
      throw new ForbiddenException('Acesso negado à meta especificada');
    }

    const percentage = goal.targetAmount.gt(0)
      ? goal.currentAmount.dividedBy(goal.targetAmount).times(100).toNumber()
      : 0;

    return {
      ...goal,
      percentage: Number(percentage.toFixed(1)),
      remainingAmount: Prisma.Decimal.max(0, goal.targetAmount.minus(goal.currentAmount)),
    };
  }

  async addDeposit(userId: string, goalId: string, dto: CreateDepositDto) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }

    if (goal.userId !== userId && goal.familyId) {
      await this.verifyFamilyAccess(userId, goal.familyId);
    } else if (goal.userId !== userId) {
      throw new ForbiddenException('Acesso negado à meta especificada');
    }

    const depositAmount = new Prisma.Decimal(dto.amount);
    const depositDate = new Date(dto.depositDate);

    return this.prisma.$transaction(async (tx) => {
      let createdTxId: string | null = null;

      if (dto.accountId) {
        const account = await tx.account.findUnique({
          where: { id: dto.accountId },
        });

        if (!account) {
          throw new NotFoundException('Conta bancária de débito não encontrada');
        }

        // Busca ou cria categoria para Investimento/Meta
        let goalCategory = await tx.category.findFirst({
          where: { name: 'Aporte em Meta' },
        });

        if (!goalCategory) {
          goalCategory = await tx.category.create({
            data: {
              name: 'Aporte em Meta',
              type: TransactionType.EXPENSE,
              icon: 'PiggyBank',
              color: '#10b981',
              isSystemDefault: true,
            },
          });
        }

        // Cria transação de despesa na conta
        const createdTx = await tx.transaction.create({
          data: {
            userId,
            familyId: goal.familyId,
            accountId: account.id,
            categoryId: goalCategory.id,
            type: TransactionType.EXPENSE,
            amount: depositAmount,
            description: `Aporte na meta: ${goal.name}`,
            transactionDate: depositDate,
            status: TransactionStatus.COMPLETED,
          },
        });

        createdTxId = createdTx.id;

        // Debita saldo da conta
        await tx.account.update({
          where: { id: account.id },
          data: { currentBalance: { decrement: depositAmount } },
        });
      }

      // Cria registro de aporte
      const deposit = await tx.goalDeposit.create({
        data: {
          goalId: goal.id,
          transactionId: createdTxId,
          amount: depositAmount,
          depositDate,
          notes: dto.notes,
        },
      });

      // Incrementa saldo da meta e atualiza status se atingido
      const updatedAmount = goal.currentAmount.add(depositAmount);
      const isCompleted = updatedAmount.gte(goal.targetAmount);

      await tx.goal.update({
        where: { id: goal.id },
        data: {
          currentAmount: updatedAmount,
          status: isCompleted ? GoalStatus.COMPLETED : goal.status,
        },
      });

      return deposit;
    });
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }

    if (goal.userId !== userId && goal.familyId) {
      await this.verifyFamilyAccess(userId, goal.familyId);
    } else if (goal.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.prisma.goal.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.targetAmount && { targetAmount: new Prisma.Decimal(dto.targetAmount) }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline ? new Date(dto.deadline) : null }),
        ...(dto.status && { status: dto.status }),
        ...(dto.color && { color: dto.color }),
        ...(dto.icon && { icon: dto.icon }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }

    if (goal.userId !== userId && goal.familyId) {
      await this.verifyFamilyAccess(userId, goal.familyId);
    } else if (goal.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    await this.prisma.goal.delete({
      where: { id },
    });

    return { message: 'Meta removida com sucesso' };
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
