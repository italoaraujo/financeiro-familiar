import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FamilyMemberRole, Prisma } from '@prisma/client';

export const TAG_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeTagName(rawName: string): string {
    if (!rawName) return '';
    let name = rawName.trim();
    if (name.startsWith('#')) {
      name = name.substring(1).trim();
    }
    return name;
  }

  getColorForTag(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
  }

  async findAll(userId: string, familyId?: string) {
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId, false);
      return this.prisma.tag.findMany({
        where: {
          familyId,
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      });
    }

    return this.prisma.tag.findMany({
      where: {
        userId,
        familyId: null,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOrCreateMany(
    userId: string,
    familyId: string | null | undefined,
    rawTagNames: string[],
    txPrisma?: Prisma.TransactionClient,
  ) {
    const client = txPrisma || this.prisma;
    const normalizedList: string[] = [];

    for (const raw of rawTagNames) {
      const name = this.normalizeTagName(raw);
      if (!name) continue;
      if (name.length > 50) {
        throw new BadRequestException(
          `O nome da tag "${name}" excede o limite máximo de 50 caracteres`,
        );
      }
      if (!normalizedList.includes(name)) {
        normalizedList.push(name);
      }
    }

    if (normalizedList.length === 0) {
      return [];
    }

    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId, true);
    }

    const tags = [];

    for (const name of normalizedList) {
      let tag = await client.tag.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          ...(familyId ? { familyId } : { userId, familyId: null }),
          deletedAt: null,
        },
      });

      if (!tag) {
        tag = await client.tag.create({
          data: {
            name,
            color: this.getColorForTag(name),
            userId,
            familyId: familyId || null,
          },
        });
      }

      tags.push(tag);
    }

    return tags;
  }

  private async verifyFamilyAccess(
    userId: string,
    familyId: string,
    isMutation: boolean = false,
  ) {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Acesso negado ao grupo familiar');
    }

    if (isMutation && member.role === FamilyMemberRole.VIEWER) {
      throw new ForbiddenException(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    }

    return member;
  }
}
