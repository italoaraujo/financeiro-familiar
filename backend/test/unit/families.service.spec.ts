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
      user: {
        findUnique: jest.fn(),
      },
      person: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: {
        updateMany: jest.fn(),
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
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'Carlos Silva' });
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
      expect(prisma.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ familyId: 'family-1', userId: 'user-1', name: 'Carlos Silva' }),
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

  describe('createPerson', () => {
    it('should successfully create a non-login person in the family', async () => {
      prisma.familyMember.findUnique.mockResolvedValueOnce({
        role: FamilyMemberRole.OWNER,
      });
      prisma.person.create.mockResolvedValueOnce({
        id: 'person-1',
        familyId: 'family-1',
        name: 'Filho Pedro',
        color: '#3b82f6',
      });

      const result = await service.createPerson('owner-id', 'family-1', {
        name: 'Filho Pedro',
        color: '#3b82f6',
      });

      expect(result.id).toBe('person-1');
      expect(prisma.person.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-1',
          name: 'Filho Pedro',
          color: '#3b82f6',
          avatarUrl: undefined,
        },
      });
    });

    it('should throw BadRequestException if name is empty', async () => {
      prisma.familyMember.findUnique.mockResolvedValueOnce({
        role: FamilyMemberRole.ADMIN,
      });

      await expect(
        service.createPerson('admin-id', 'family-1', {
          name: '   ',
        }),
      ).rejects.toThrow();
    });

    it('should throw ForbiddenException if requester is VIEWER', async () => {
      prisma.familyMember.findUnique.mockResolvedValueOnce({
        role: FamilyMemberRole.VIEWER,
      });

      await expect(
        service.createPerson('viewer-id', 'family-1', {
          name: 'Sobrinho',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getFamilyPeople', () => {
    it('should list all family people and sync missing login members', async () => {
      prisma.familyMember.findUnique.mockResolvedValueOnce({
        role: FamilyMemberRole.MEMBER,
      });
      prisma.familyMember.findMany.mockResolvedValueOnce([
        { userId: 'user-1', role: FamilyMemberRole.OWNER, user: { name: 'Pai' } },
        { userId: 'user-2', role: FamilyMemberRole.MEMBER, user: { name: 'Mãe' } },
      ]);
      prisma.person.findMany
        .mockResolvedValueOnce([
          { id: 'person-1', userId: 'user-1', name: 'Pai', color: '#10b981' },
        ])
        .mockResolvedValueOnce([
          { id: 'person-1', userId: 'user-1', name: 'Pai', color: '#10b981' },
          { id: 'person-2', userId: 'user-2', name: 'Mãe', color: '#3b82f6' },
          { id: 'person-3', userId: null, name: 'Filho Pedro', color: '#8b5cf6' },
        ]);

      const result = await service.getFamilyPeople('user-1', 'family-1');

      expect(result).toHaveLength(3);
      expect(prisma.person.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Mãe', userId: 'user-2' }),
        }),
      );
    });
  });

  describe('removePerson', () => {
    it('should throw BadRequestException if person is linked to a user account', async () => {
      prisma.familyMember.findUnique.mockResolvedValueOnce({
        role: FamilyMemberRole.OWNER,
      });
      prisma.person.findUnique.mockResolvedValueOnce({
        id: 'person-1',
        familyId: 'family-1',
        userId: 'user-1',
        name: 'Carlos',
      });

      await expect(
        service.removePerson('owner-id', 'family-1', 'person-1'),
      ).rejects.toThrow();
    });

    it('should successfully soft delete a non-login person while preserving transaction bindings', async () => {
      prisma.familyMember.findUnique.mockResolvedValueOnce({
        role: FamilyMemberRole.OWNER,
      });
      prisma.person.findUnique.mockResolvedValueOnce({
        id: 'person-child',
        familyId: 'family-1',
        userId: null,
        name: 'Pedro',
        deletedAt: null,
      });
      prisma.person.update.mockResolvedValueOnce({ id: 'person-child' });

      const result = await service.removePerson('owner-id', 'family-1', 'person-child');

      expect(result.message).toContain('sucesso');
      expect(prisma.transaction.updateMany).not.toHaveBeenCalled();
      expect(prisma.person.delete).not.toHaveBeenCalled();
      expect(prisma.person.update).toHaveBeenCalledWith({
        where: { id: 'person-child' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if person is already deleted', async () => {
      prisma.familyMember.findUnique.mockResolvedValueOnce({
        role: FamilyMemberRole.OWNER,
      });
      prisma.person.findUnique.mockResolvedValueOnce({
        id: 'person-child',
        familyId: 'family-1',
        userId: null,
        name: 'Pedro',
        deletedAt: new Date(),
      });

      await expect(
        service.removePerson('owner-id', 'family-1', 'person-child'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
