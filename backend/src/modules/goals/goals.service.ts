import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import {
  GoalMovementType,
  GoalStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto) {
    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId);
    }

    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Conta bancária vinculada não encontrada');
    }

    if (dto.familyId) {
      if (account.familyId && account.familyId !== dto.familyId) {
        throw new ForbiddenException('A conta bancária informada não pertence ao grupo familiar da meta');
      }
    } else if (account.userId !== userId) {
      throw new ForbiddenException('A conta bancária informada não pertence ao usuário');
    }

    return this.prisma.goal.create({
      data: {
        userId,
        familyId: dto.familyId || null,
        accountId: dto.accountId,
        name: dto.name,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        currentAmount: new Prisma.Decimal(0),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        status: GoalStatus.IN_PROGRESS,
        color: dto.color || '#10b981',
        icon: dto.icon || 'Target',
      },
      include: {
        account: {
          select: { id: true, name: true, color: true, icon: true, currentBalance: true },
        },
      },
    });
  }

  async findAll(userId: string, familyId?: string) {
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId);
    }

    const goals = await this.prisma.goal.findMany({
      where: familyId ? { familyId, deletedAt: null } : { userId, deletedAt: null },
      include: {
        account: {
          select: { id: true, name: true, color: true, icon: true, currentBalance: true },
        },
        deposits: {
          orderBy: { depositDate: 'desc' },
          take: 10,
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
        account: {
          select: { id: true, name: true, color: true, icon: true, currentBalance: true },
        },
        deposits: {
          orderBy: { depositDate: 'desc' },
        },
      },
    });

    if (!goal || goal.deletedAt) {
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

    if (!goal || goal.deletedAt) {
      throw new NotFoundException('Meta não encontrada');
    }

    if (goal.userId !== userId && goal.familyId) {
      await this.verifyFamilyAccess(userId, goal.familyId);
    } else if (goal.userId !== userId) {
      throw new ForbiddenException('Acesso negado à meta especificada');
    }

    const depositAmount = new Prisma.Decimal(dto.amount);
    if (depositAmount.lte(0)) {
      throw new BadRequestException('O valor do aporte deve ser maior que zero');
    }

    const depositDate = new Date(dto.depositDate);
    const targetAccountId = dto.accountId || goal.accountId;

    return this.prisma.$transaction(async (tx) => {
      let createdTxId: string | null = null;

      const account = await tx.account.findUnique({
        where: { id: targetAccountId },
      });

      if (!account || account.deletedAt) {
        throw new NotFoundException('Conta bancária de débito não encontrada');
      }

      if (depositAmount.gt(account.currentBalance)) {
        throw new BadRequestException(
          `Saldo insuficiente na conta bancária vinculada para realizar o aporte. Saldo disponível: R$ ${account.currentBalance.toFixed(2)}`
        );
      }

      // Busca ou cria categoria para Aporte em Meta (Transferência Interna)
      let goalCategory = await tx.category.findFirst({
        where: { name: 'Aporte em Meta' },
      });

      if (!goalCategory) {
        goalCategory = await tx.category.create({
          data: {
            name: 'Aporte em Meta',
            type: TransactionType.TRANSFER,
            icon: 'PiggyBank',
            color: '#10b981',
            isSystemDefault: true,
          },
        });
      } else if (goalCategory.type !== TransactionType.TRANSFER) {
        goalCategory = await tx.category.update({
          where: { id: goalCategory.id },
          data: { type: TransactionType.TRANSFER },
        });
      }

      // Cria transação de transferência patrimonial na conta bancária
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          familyId: goal.familyId,
          accountId: account.id,
          categoryId: goalCategory.id,
          type: TransactionType.TRANSFER,
          amount: depositAmount,
          description: `Aporte na meta: ${goal.name}`,
          transactionDate: depositDate,
          status: TransactionStatus.COMPLETED,
        },
      });

      createdTxId = createdTx.id;

      // Debita saldo da conta vinculada
      await tx.account.update({
        where: { id: account.id },
        data: { currentBalance: { decrement: depositAmount } },
      });

      // Cria registro de aporte no histórico
      const deposit = await tx.goalDeposit.create({
        data: {
          goalId: goal.id,
          transactionId: createdTxId,
          type: GoalMovementType.DEPOSIT,
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

  async withdraw(userId: string, goalId: string, dto: CreateWithdrawalDto) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.deletedAt) {
      throw new NotFoundException('Meta não encontrada');
    }

    if (goal.userId !== userId && goal.familyId) {
      await this.verifyFamilyAccess(userId, goal.familyId);
    } else if (goal.userId !== userId) {
      throw new ForbiddenException('Acesso negado à meta especificada');
    }

    const withdrawAmount = new Prisma.Decimal(dto.amount);
    if (withdrawAmount.lte(0)) {
      throw new BadRequestException('O valor do resgate deve ser maior que zero');
    }

    if (withdrawAmount.gt(goal.currentAmount)) {
      throw new BadRequestException(
        `Saldo insuficiente na meta para realizar o resgate. Saldo disponível: R$ ${goal.currentAmount.toFixed(2)}`
      );
    }

    const withdrawalDate = new Date(dto.withdrawalDate);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { id: goal.accountId },
      });

      if (!account || account.deletedAt) {
        throw new NotFoundException('Conta bancária vinculada à meta não encontrada');
      }

      // Busca ou cria categoria para Resgate de Meta (Transferência Interna)
      let returnCategory = await tx.category.findFirst({
        where: { name: 'Resgate de Meta' },
      });

      if (!returnCategory) {
        returnCategory = await tx.category.create({
          data: {
            name: 'Resgate de Meta',
            type: TransactionType.TRANSFER,
            icon: 'PiggyBank',
            color: '#10b981',
            isSystemDefault: true,
          },
        });
      } else if (returnCategory.type !== TransactionType.TRANSFER) {
        returnCategory = await tx.category.update({
          where: { id: returnCategory.id },
          data: { type: TransactionType.TRANSFER },
        });
      }

      // Cria transação de transferência patrimonial na conta vinculada
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          familyId: goal.familyId,
          accountId: account.id,
          categoryId: returnCategory.id,
          type: TransactionType.TRANSFER,
          amount: withdrawAmount,
          description: `Resgate da meta: ${goal.name}`,
          transactionDate: withdrawalDate,
          status: TransactionStatus.COMPLETED,
        },
      });

      // Credita saldo na conta bancária vinculada
      await tx.account.update({
        where: { id: account.id },
        data: { currentBalance: { increment: withdrawAmount } },
      });

      // Cria registro de retirada no histórico da meta
      const withdrawalMovement = await tx.goalDeposit.create({
        data: {
          goalId: goal.id,
          transactionId: createdTx.id,
          type: GoalMovementType.WITHDRAWAL,
          amount: withdrawAmount,
          depositDate: withdrawalDate,
          notes: dto.notes,
        },
      });

      // Decrementa saldo da meta e rebaixa status se necessário
      const updatedAmount = goal.currentAmount.minus(withdrawAmount);
      const shouldRevertStatus =
        goal.status === GoalStatus.COMPLETED && updatedAmount.lt(goal.targetAmount);

      await tx.goal.update({
        where: { id: goal.id },
        data: {
          currentAmount: updatedAmount,
          status: shouldRevertStatus ? GoalStatus.IN_PROGRESS : goal.status,
        },
      });

      return withdrawalMovement;
    });
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goal || goal.deletedAt) {
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

    if (!goal || goal.deletedAt) {
      throw new NotFoundException('Meta não encontrada');
    }

    if (goal.userId !== userId && goal.familyId) {
      await this.verifyFamilyAccess(userId, goal.familyId);
    } else if (goal.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    if (goal.currentAmount.gt(0)) {
      throw new BadRequestException(
        `Não é possível excluir uma meta com saldo acumulado (R$ ${goal.currentAmount.toFixed(2)}). Realize o resgate do valor antes de excluir.`
      );
    }

    await this.prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
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
