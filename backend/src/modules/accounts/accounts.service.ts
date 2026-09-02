import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAccountDto) {
    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId);
    }

    const initial = new Prisma.Decimal(dto.initialBalance || 0);

    return this.prisma.account.create({
      data: {
        userId,
        familyId: dto.familyId || null,
        name: dto.name,
        type: dto.type,
        initialBalance: initial,
        currentBalance: initial,
        currency: dto.currency || 'BRL',
        color: dto.color,
        icon: dto.icon,
      },
    });
  }

  async findAll(userId: string, familyId?: string) {
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId);
      return this.prisma.account.findMany({
        where: {
          familyId,
          isArchived: false,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.account.findMany({
      where: {
        userId,
        isArchived: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(userId: string, id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Conta não encontrada');
    }

    if (account.userId !== userId && account.familyId) {
      await this.verifyFamilyAccess(userId, account.familyId);
    } else if (account.userId !== userId) {
      throw new ForbiddenException('Acesso negado à conta especificada');
    }

    return account;
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.findById(userId, id);

    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId);
    }

    return this.prisma.account.update({
      where: { id: account.id },
      data: {
        name: dto.name,
        type: dto.type,
        color: dto.color,
        icon: dto.icon,
        familyId: dto.familyId !== undefined ? dto.familyId : account.familyId,
      },
    });
  }

  async archive(userId: string, id: string) {
    const account = await this.findById(userId, id);

    return this.prisma.account.update({
      where: { id: account.id },
      data: { isArchived: true, isActive: false },
    });
  }

  async remove(userId: string, id: string) {
    const account = await this.findById(userId, id);

    const hasTransactions = await this.prisma.transaction.findFirst({
      where: {
        OR: [{ accountId: account.id }, { destinationAccountId: account.id }],
      },
    });

    if (hasTransactions) {
      throw new BadRequestException(
        'Não é possível excluir uma conta que possui lançamentos vinculados. Utilize a opção de arquivar a conta.',
      );
    }

    await this.prisma.account.delete({
      where: { id: account.id },
    });

    return { message: 'Conta removida com sucesso' };
  }

  private async verifyFamilyAccess(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Você não tem acesso a este grupo familiar');
    }
  }
}
