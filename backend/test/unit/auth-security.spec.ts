import { UnauthorizedException } from '@nestjs/common';
import { validateJwtSecret } from '../../src/modules/auth/auth.module';
import { JwtStrategy } from '../../src/modules/auth/jwt.strategy';
import { TokenBlacklistService } from '../../src/modules/auth/token-blacklist.service';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { UsersService } from '../../src/modules/users/users.service';

describe('JWT Security Configuration (SEC-CRIT-03)', () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  describe('validateJwtSecret', () => {
    it('should throw fatal error when secret is undefined or empty', () => {
      expect(() => validateJwtSecret(undefined)).toThrow(
        'FATAL: A variável JWT_SECRET deve ser configurada com no mínimo 32 caracteres seguros.',
      );
      expect(() => validateJwtSecret('')).toThrow(
        'FATAL: A variável JWT_SECRET deve ser configurada com no mínimo 32 caracteres seguros.',
      );
    });

    it('should throw fatal error when secret has fewer than 32 characters', () => {
      expect(() => validateJwtSecret('short_key_123456789012345')).toThrow(
        'FATAL: A variável JWT_SECRET deve ser configurada com no mínimo 32 caracteres seguros.',
      );
    });

    it('should throw fatal error when secret contains supersecret pattern', () => {
      expect(() =>
        validateJwtSecret('supersecretjwtkey1234567890_com_mais_de_32_chars'),
      ).toThrow(
        'FATAL: A variável JWT_SECRET deve ser configurada com no mínimo 32 caracteres seguros.',
      );
    });

    it('should successfully return the secret when it has 32 or more secure characters', () => {
      const validSecret = 'c8e763b2f8a94d01b1e9c2f6d5a84e32109876543210abcdef0123456789abcdef';
      expect(validateJwtSecret(validSecret)).toBe(validSecret);
    });
  });

  describe('JwtStrategy initialization', () => {
    const mockUsersService = {} as UsersService;

    it('should throw fatal error when initializing JwtStrategy with invalid JWT_SECRET in process.env', () => {
      process.env.JWT_SECRET = 'short_key';
      expect(() => new JwtStrategy(mockUsersService)).toThrow(
        'FATAL: A variável JWT_SECRET deve ser configurada com no mínimo 32 caracteres seguros.',
      );
    });

    it('should successfully initialize JwtStrategy when process.env.JWT_SECRET is valid and secure', () => {
      process.env.JWT_SECRET = 'c8e763b2f8a94d01b1e9c2f6d5a84e32109876543210abcdef0123456789abcdef';
      const strategy = new JwtStrategy(mockUsersService);
      expect(strategy).toBeDefined();
    });
  });

  describe('TokenBlacklistService & Server-side Logout (SEC-MED-03)', () => {
    let blacklistService: TokenBlacklistService;
    let mockUsersService: any;
    let jwtStrategy: JwtStrategy;

    beforeEach(() => {
      blacklistService = new TokenBlacklistService();
      mockUsersService = {
        findById: jest.fn(),
      };
      process.env.JWT_SECRET = 'c8e763b2f8a94d01b1e9c2f6d5a84e32109876543210abcdef0123456789abcdef';
      jwtStrategy = new JwtStrategy(mockUsersService, blacklistService);
    });

    it('should correctly flag tokens as blacklisted when added', async () => {
      expect(await blacklistService.isBlacklisted('token-123')).toBe(false);
      await blacklistService.add('token-123');
      expect(await blacklistService.isBlacklisted('token-123')).toBe(true);
    });

    it('should evict expired tokens from blacklist', async () => {
      await blacklistService.add('token-short-lived', -1000); // Já expirado
      expect(await blacklistService.isBlacklisted('token-short-lived')).toBe(false);
    });

    it('should persist and retrieve revoked token using Prisma database integration', async () => {
      const mockPrisma: any = {
        revokedToken: {
          upsert: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn().mockResolvedValue({
            tokenHash: 'mock-hash',
            expiresAt: new Date(Date.now() + 60000),
          }),
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      const persistentService = new TokenBlacklistService(mockPrisma);
      await persistentService.add('db-token');
      expect(mockPrisma.revokedToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenHash: expect.any(String) },
          create: expect.objectContaining({ expiresAt: expect.any(Date) }),
        }),
      );

      persistentService.clear(); // Limpa memória para forçar consulta ao banco
      const isBlocked = await persistentService.isBlacklisted('db-token');
      expect(isBlocked).toBe(true);
      expect(mockPrisma.revokedToken.findUnique).toHaveBeenCalled();
    });

    it('should reject request with UnauthorizedException when token is blacklisted', async () => {
      const revokedToken = 'revoked.jwt.token';
      await blacklistService.add(revokedToken);

      const mockReq = {
        headers: {
          authorization: `Bearer ${revokedToken}`,
        },
      };

      await expect(
        jwtStrategy.validate(mockReq, { sub: 'user-1', email: 'user@test.com' }),
      ).rejects.toThrow(new UnauthorizedException('Token revogado. Faça login novamente.'));
    });

    it('should allow valid request when token is not blacklisted', async () => {
      const validToken = 'valid.jwt.token';
      const mockReq = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };

      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        name: 'User Test',
        passwordHash: 'hashedpassword',
      });

      const result = await jwtStrategy.validate(mockReq, { sub: 'user-1', email: 'user@test.com' });
      expect(result).toEqual({
        id: 'user-1',
        email: 'user@test.com',
        name: 'User Test',
      });
    });

    it('should revoke token and return success message in AuthController.logout', async () => {
      const mockAuthService = {} as any;
      const controller = new AuthController(mockAuthService, blacklistService);

      const tokenToRevoke = 'user.active.token';
      const mockReq = {
        headers: {
          authorization: `Bearer ${tokenToRevoke}`,
        },
      };

      const response = await controller.logout(mockReq);
      expect(response).toEqual({ message: 'Sessão encerrada com sucesso' });
      expect(await blacklistService.isBlacklisted(tokenToRevoke)).toBe(true);
    });
  });
});
