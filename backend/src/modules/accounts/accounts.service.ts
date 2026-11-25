import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { FamilyMemberRole, Prisma } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAccountDto) {
    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId, true);
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

  async findAll(userId: string, familyId?: string, includeArchived: boolean = false) {
    const archiveFilter = includeArchived ? {} : { isArchived: false };

    let accounts;
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId, false);
      accounts = await this.prisma.account.findMany({
        where: {
          familyId,
          ...archiveFilter,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      accounts = await this.prisma.account.findMany({
        where: {
          userId,
          familyId: null,
          ...archiveFilter,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (accounts.length === 0) {
      return [];
    }

    const favorites = await this.prisma.userFavoriteAccount.findMany({
      where: {
        userId,
        accountId: { in: accounts.map((a) => a.id) },
      },
      select: { accountId: true },
    });
    const favoriteIds = new Set(favorites.map((f) => f.accountId));

    return accounts
      .map((acc) => ({
        ...acc,
        isFavorite: favoriteIds.has(acc.id),
      }))
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) {
          return a.isFavorite ? -1 : 1;
        }
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  async findById(userId: string, id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Conta não encontrada');
    }

    if (account.userId !== userId && account.familyId) {
      await this.verifyFamilyAccess(userId, account.familyId, false);
    } else if (account.userId !== userId) {
      throw new ForbiddenException('Acesso negado à conta especificada');
    }

    const favorite = await this.prisma.userFavoriteAccount.findUnique({
      where: {
        userId_accountId: { userId, accountId: account.id },
      },
    });

    return {
      ...account,
      isFavorite: Boolean(favorite),
    };
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.findById(userId, id);

    if (account.familyId) {
      await this.verifyFamilyAccess(userId, account.familyId, true);
    }

    if (dto.familyId && dto.familyId !== account.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId, true);
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

  async favorite(userId: string, id: string) {
    const account = await this.findById(userId, id);

    if (account.familyId) {
      await this.verifyFamilyAccess(userId, account.familyId, true);
    }

    if (account.isArchived) {
      throw new BadRequestException('Não é possível favoritar uma conta arquivada');
    }

    await this.prisma.userFavoriteAccount.upsert({
      where: {
        userId_accountId: { userId, accountId: account.id },
      },
      create: { userId, accountId: account.id },
      update: {},
    });

    return {
      ...account,
      isFavorite: true,
    };
  }

  async unfavorite(userId: string, id: string) {
    const account = await this.findById(userId, id);

    if (account.familyId) {
      await this.verifyFamilyAccess(userId, account.familyId, true);
    }

    await this.prisma.userFavoriteAccount.deleteMany({
      where: { userId, accountId: account.id },
    });

    return {
      ...account,
      isFavorite: false,
    };
  }

  async archive(userId: string, id: string) {
    const account = await this.findById(userId, id);

    if (account.familyId) {
      await this.verifyFamilyAccess(userId, account.familyId, true);
    }

    const archived = await this.prisma.$transaction(async (tx) => {
      await tx.userFavoriteAccount.deleteMany({
        where: { accountId: account.id },
      });

      return tx.account.update({
        where: { id: account.id },
        data: { isArchived: true, isActive: false },
      });
    });

    return {
      ...archived,
      isFavorite: false,
    };
  }

  async unarchive(userId: string, id: string) {
    const account = await this.findById(userId, id);

    if (account.familyId) {
      await this.verifyFamilyAccess(userId, account.familyId, true);
    }

    if (!account.isArchived) {
      throw new BadRequestException('A conta não está arquivada');
    }

    const reactivated = await this.prisma.account.update({
      where: { id: account.id },
      data: { isArchived: false, isActive: true },
    });

    return {
      ...reactivated,
      isFavorite: false,
    };
  }

  async remove(userId: string, id: string) {
    const account = await this.findById(userId, id);

    if (account.familyId) {
      await this.verifyFamilyAccess(userId, account.familyId, true);
    }

    const hasTransactions = await this.prisma.transaction.findFirst({
      where: {
        OR: [{ accountId: account.id }, { destinationAccountId: account.id }],
        deletedAt: null,
      },
    });

    if (hasTransactions) {
      throw new BadRequestException(
        'Não é possível excluir uma conta que possui lançamentos vinculados. Utilize a opção de arquivar a conta.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userFavoriteAccount.deleteMany({
        where: { accountId: account.id },
      });

      await tx.account.update({
        where: { id: account.id },
        data: { deletedAt: new Date(), isActive: false },
      });
    });

    return { message: 'Conta removida com sucesso' };
  }

  private async verifyFamilyAccess(userId: string, familyId: string, isMutation: boolean = false) {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Você não tem acesso a este grupo familiar');
    }

    if (isMutation && member.role === FamilyMemberRole.VIEWER) {
      throw new ForbiddenException(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    }

    return member;
  }
}
