import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should successfully register a new user and return access token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Maria Silva',
        email: 'maria@email.com',
        passwordHash: 'hashedpassword',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register({
        name: 'Maria Silva',
        email: 'maria@email.com',
        password: 'password123',
      });

      expect(result.user.name).toBe('Maria Silva');
      expect(result.user.email).toBe('maria@email.com');
      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Maria Silva',
          email: 'maria@email.com',
        }),
      );
    });

    it('should throw ConflictException if email is already in use', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'existing-id',
        name: 'Existing',
        email: 'maria@email.com',
      } as any);

      await expect(
        authService.register({
          name: 'Maria Silva',
          email: 'maria@email.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Maria Silva',
        email: 'maria@email.com',
        passwordHash: hashedPassword,
        avatarUrl: null,
        memberships: [],
      } as any);

      const result = await authService.login({
        email: 'maria@email.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.email).toBe('maria@email.com');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'notfound@email.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Maria Silva',
        email: 'maria@email.com',
        passwordHash: hashedPassword,
      } as any);

      await expect(
        authService.login({
          email: 'maria@email.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
