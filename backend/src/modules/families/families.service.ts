import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreatePersonDto } from './dto/create-person.dto';
import { FamilyMemberRole } from '@prisma/client';

@Injectable()
export class FamiliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateFamilyDto) {
    return this.prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: {
          name: dto.name,
          description: dto.description,
          ownerId: userId,
        },
      });

      await tx.familyMember.create({
        data: {
          familyId: family.id,
          userId,
          role: FamilyMemberRole.OWNER,
        },
      });

      const ownerUser = await tx.user.findUnique({ where: { id: userId } });
      await tx.person.create({
        data: {
          familyId: family.id,
          userId,
          name: ownerUser?.name || 'Titular',
          color: '#10b981',
        },
      });

      return family;
    });
  }

  async getUserFamilies(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      role: m.role,
      joinedAt: m.joinedAt,
      family: m.family,
    }));
  }

  async getFamily(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Acesso negado: você não pertence a este grupo familiar');
    }

    return {
      role: member.role,
      family: member.family,
    };
  }

  async addMember(userId: string, familyId: string, dto: AddMemberDto) {
    const requester = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN')) {
      throw new ForbiddenException('Apenas administradores podem adicionar novos membros');
    }

    const targetUser = await this.usersService.findByEmail(dto.email);
    if (!targetUser) {
      throw new NotFoundException(`Nenhum usuário cadastrado com o e-mail ${dto.email}`);
    }

    const existingMember = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId: targetUser.id },
      },
    });

    if (existingMember) {
      throw new BadRequestException('Este usuário já é membro do grupo familiar');
    }

    const member = await this.prisma.familyMember.create({
      data: {
        familyId,
        userId: targetUser.id,
        role: dto.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Garante perfil de pessoa correspondente
    const existingPerson = await this.prisma.person.findFirst({
      where: { familyId, userId: targetUser.id },
    });
    if (!existingPerson) {
      await this.prisma.person.create({
        data: {
          familyId,
          userId: targetUser.id,
          name: targetUser.name,
          color: '#3b82f6',
        },
      });
    }

    return member;
  }

  async removeMember(userId: string, familyId: string, targetUserId: string) {
    const requester = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN')) {
      throw new ForbiddenException('Apenas administradores podem remover membros');
    }

    const targetMember = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId: targetUserId },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Membro não encontrado no grupo familiar');
    }

    if (targetMember.role === 'OWNER') {
      throw new BadRequestException('Não é possível remover o proprietário da família');
    }

    await this.prisma.familyMember.delete({
      where: {
        familyId_userId: { familyId, userId: targetUserId },
      },
    });

    return { message: 'Membro removido com sucesso' };
  }

  async createPerson(userId: string, familyId: string, dto: CreatePersonDto) {
    await this.verifyFamilyAdmin(userId, familyId);

    const trimmedName = dto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestException('Nome da pessoa é obrigatório');
    }

    return this.prisma.person.create({
      data: {
        familyId,
        name: trimmedName,
        color: dto.color || '#8b5cf6',
        avatarUrl: dto.avatarUrl,
      },
    });
  }

  async getFamilyPeople(userId: string, familyId: string) {
    await this.verifyFamilyAccess(userId, familyId);

    // Auto-sincronização de membros com login que ainda não possuem Person vinculada
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
      include: { user: true },
    });

    const existingPeople = await this.prisma.person.findMany({
      where: { familyId, deletedAt: null },
    });

    const existingUserIds = new Set(existingPeople.map((p) => p.userId).filter(Boolean));

    for (const m of members) {
      if (!existingUserIds.has(m.userId)) {
        const personForUser = await this.prisma.person.findFirst({
          where: { familyId, userId: m.userId },
        });

        if (!personForUser) {
          await this.prisma.person.create({
            data: {
              familyId,
              userId: m.userId,
              name: m.user.name,
              color: m.role === FamilyMemberRole.OWNER ? '#10b981' : '#3b82f6',
              avatarUrl: m.user.avatarUrl,
            },
          });
        } else if (personForUser.deletedAt) {
          await this.prisma.person.update({
            where: { id: personForUser.id },
            data: { deletedAt: null },
          });
        }
      }
    }

    return this.prisma.person.findMany({
      where: { familyId, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updatePerson(
    userId: string,
    familyId: string,
    personId: string,
    dto: Partial<CreatePersonDto>,
  ) {
    await this.verifyFamilyAdmin(userId, familyId);

    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person || person.familyId !== familyId || person.deletedAt) {
      throw new NotFoundException('Pessoa não encontrada neste grupo familiar');
    }

    return this.prisma.person.update({
      where: { id: personId },
      data: {
        name: dto.name?.trim() || person.name,
        color: dto.color ?? person.color,
        avatarUrl: dto.avatarUrl ?? person.avatarUrl,
      },
    });
  }

  async removePerson(userId: string, familyId: string, personId: string) {
    await this.verifyFamilyAdmin(userId, familyId);

    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person || person.familyId !== familyId || person.deletedAt) {
      throw new NotFoundException('Pessoa não encontrada neste grupo familiar');
    }

    if (person.userId) {
      throw new BadRequestException(
        'Não é possível remover diretamente uma pessoa vinculada a uma conta de usuário. Remova o membro da família.',
      );
    }

    await this.prisma.person.update({
      where: { id: personId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Pessoa removida da família com sucesso' };
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
    return member;
  }

  private async verifyFamilyAdmin(userId: string, familyId: string) {
    const member = await this.verifyFamilyAccess(userId, familyId);
    if (member.role !== FamilyMemberRole.OWNER && member.role !== FamilyMemberRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem gerenciar pessoas da família');
    }
    return member;
  }
}
