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

    return this.prisma.familyMember.create({
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
}
