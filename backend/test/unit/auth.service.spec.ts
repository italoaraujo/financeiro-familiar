import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  const originalEnv = process.env.DISABLE_REGISTRATION;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DISABLE_REGISTRATION = originalEnv;
    } else {
      delete process.env.DISABLE_REGISTRATION;
    }
  });

  beforeEach(async () => {
    delete process.env.DISABLE_REGISTRATION;
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

    it('should throw ForbiddenException when DISABLE_REGISTRATION is true', async () => {
      process.env.DISABLE_REGISTRATION = 'true';

      await expect(
        authService.register({
          name: 'Maria Silva',
          email: 'maria@email.com',
          password: 'password123',
        }),
      ).rejects.toThrow(
        new ForbiddenException('O cadastro de novos usuários está desativado pelo administrador'),
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when DISABLE_REGISTRATION has spaces or truthy variations', async () => {
      process.env.DISABLE_REGISTRATION = '  True ';

      await expect(
        authService.register({
          name: 'Maria Silva',
          email: 'maria@email.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ForbiddenException);

      process.env.DISABLE_REGISTRATION = '1';
      await expect(
        authService.register({
          name: 'Maria Silva',
          email: 'maria@email.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('isRegistrationEnabled', () => {
    it('should return true by default or when set to false', () => {
      delete process.env.DISABLE_REGISTRATION;
      expect(authService.isRegistrationEnabled()).toBe(true);

      process.env.DISABLE_REGISTRATION = 'false';
      expect(authService.isRegistrationEnabled()).toBe(true);
    });

    it('should return false when DISABLE_REGISTRATION is true, 1 or yes', () => {
      process.env.DISABLE_REGISTRATION = 'true';
      expect(authService.isRegistrationEnabled()).toBe(false);

      process.env.DISABLE_REGISTRATION = '1';
      expect(authService.isRegistrationEnabled()).toBe(false);

      process.env.DISABLE_REGISTRATION = 'YES';
      expect(authService.isRegistrationEnabled()).toBe(false);
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
