import { Test, TestingModule } from '@nestjs/testing';
import { FamiliesService } from '../../src/modules/families/families.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UsersService } from '../../src/modules/users/users.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FamilyMemberRole } from '@prisma/client';

describe('FamiliesService', () => {
  let service: FamiliesService;
  let prisma: any;
  let usersService: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      family: {
        create: jest.fn(),
      },
      familyMember: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    usersService = {
      findByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamiliesService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<FamiliesService>(FamiliesService);
  });

  describe('create', () => {
    it('should create family and assign creator as OWNER', async () => {
      const createdFamily = { id: 'family-1', name: 'Família Silva', ownerId: 'user-1' };
      prisma.family.create.mockResolvedValue(createdFamily);
      prisma.familyMember.create.mockResolvedValue({
        id: 'member-1',
        familyId: 'family-1',
        userId: 'user-1',
        role: FamilyMemberRole.OWNER,
      });

      const result = await service.create('user-1', { name: 'Família Silva' });

      expect(result.id).toBe('family-1');
      expect(prisma.family.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Família Silva', ownerId: 'user-1' }),
      });
      expect(prisma.familyMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ familyId: 'family-1', userId: 'user-1', role: 'OWNER' }),
      });
    });
  });

  describe('addMember', () => {
    it('should throw ForbiddenException if requester is not OWNER or ADMIN', async () => {
      prisma.familyMember.findUnique.mockResolvedValueOnce({
        role: FamilyMemberRole.VIEWER,
      });

      await expect(
        service.addMember('viewer-id', 'family-1', {
          email: 'new@email.com',
          role: FamilyMemberRole.MEMBER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if target user is not registered', async () => {
      prisma.familyMember.findUnique.mockResolvedValueOnce({
        role: FamilyMemberRole.OWNER,
      });
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.addMember('owner-id', 'family-1', {
          email: 'notregistered@email.com',
          role: FamilyMemberRole.MEMBER,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
