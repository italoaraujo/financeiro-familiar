import { Test, TestingModule } from '@nestjs/testing';
import { TagsService, TAG_COLORS } from '../../src/modules/tags/tags.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FamilyMemberRole } from '@prisma/client';

describe('TagsService', () => {
  let service: TagsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tag: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      familyMember: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  describe('normalizeTagName', () => {
    it('should trim and remove leading hash', () => {
      expect(service.normalizeTagName('  #viagem-praia  ')).toBe('viagem-praia');
      expect(service.normalizeTagName('trabalho')).toBe('trabalho');
      expect(service.normalizeTagName('')).toBe('');
      expect(service.normalizeTagName('#')).toBe('');
    });
  });

  describe('getColorForTag', () => {
    it('should return a valid color from palette deterministically', () => {
      const color1 = service.getColorForTag('viagem');
      const color2 = service.getColorForTag('viagem');
      expect(color1).toBe(color2);
      expect(TAG_COLORS).toContain(color1);
    });
  });

  describe('findAll', () => {
    it('should list personal tags when no familyId is provided', async () => {
      const mockTags = [
        { id: 't1', name: 'pessoal', color: '#10b981', userId: 'user-1', familyId: null },
      ];
      prisma.tag.findMany.mockResolvedValue(mockTags);

      const result = await service.findAll('user-1');

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          familyId: null,
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockTags);
    });

    it('should list family tags when user belongs to the family', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'fm-1',
        userId: 'user-1',
        familyId: 'fam-1',
        role: FamilyMemberRole.MEMBER,
      });
      const mockTags = [
        { id: 't2', name: 'mercado', color: '#3b82f6', userId: 'user-1', familyId: 'fam-1' },
      ];
      prisma.tag.findMany.mockResolvedValue(mockTags);

      const result = await service.findAll('user-1', 'fam-1');

      expect(prisma.familyMember.findUnique).toHaveBeenCalledWith({
        where: { familyId_userId: { familyId: 'fam-1', userId: 'user-1' } },
      });
      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'fam-1',
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockTags);
    });

    it('should throw ForbiddenException if user does not belong to family', async () => {
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(service.findAll('user-1', 'fam-999')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOrCreateMany', () => {
    it('should return empty array when no valid names are provided', async () => {
      const result = await service.findOrCreateMany('user-1', null, ['', '   ', '#']);
      expect(result).toEqual([]);
      expect(prisma.tag.findFirst).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if tag name exceeds 50 characters', async () => {
      const longName = 'a'.repeat(51);
      await expect(
        service.findOrCreateMany('user-1', null, [longName]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is VIEWER in family', async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        id: 'fm-1',
        userId: 'user-1',
        familyId: 'fam-1',
        role: FamilyMemberRole.VIEWER,
      });

      await expect(
        service.findOrCreateMany('user-1', 'fam-1', ['nova-tag']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reuse existing tag and create new tag if not found', async () => {
      const existingTag = {
        id: 't-exist',
        name: 'viagem',
        color: '#10b981',
        userId: 'user-1',
        familyId: null,
      };
      const createdTag = {
        id: 't-new',
        name: 'hotel',
        color: '#3b82f6',
        userId: 'user-1',
        familyId: null,
      };

      prisma.tag.findFirst.mockImplementation(({ where }: any) => {
        if (where.name.equals === 'viagem') {
          return Promise.resolve(existingTag);
        }
        return Promise.resolve(null);
      });

      prisma.tag.create.mockResolvedValue(createdTag);

      const result = await service.findOrCreateMany('user-1', null, [
        '#viagem',
        'hotel',
        'viagem', // duplicate
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(existingTag);
      expect(result[1]).toEqual(createdTag);
      expect(prisma.tag.create).toHaveBeenCalledTimes(1);
    });
  });
});
