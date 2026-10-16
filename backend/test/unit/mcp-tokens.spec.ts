import * as crypto from 'crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { TokenBlacklistService } from '../../src/modules/auth/token-blacklist.service';
import { CreateMcpTokenDto } from '../../src/modules/auth/dto/create-mcp-token.dto';

describe('MCP Access Tokens (MCP-01 & MCP-02)', () => {
  describe('CreateMcpTokenDto Validation', () => {
    it('should validate a valid DTO with default expiresInDays', async () => {
      const dto = plainToInstance(CreateMcpTokenDto, {
        name: 'Antigravity Assistant',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.expiresInDays).toBe(90);
    });

    it('should reject empty name or name exceeding 100 characters', async () => {
      const emptyDto = plainToInstance(CreateMcpTokenDto, { name: '' });
      const emptyErrors = await validate(emptyDto);
      expect(emptyErrors.find((e) => e.property === 'name')).toBeDefined();

      const longDto = plainToInstance(CreateMcpTokenDto, { name: 'A'.repeat(101) });
      const longErrors = await validate(longDto);
      expect(longErrors.find((e) => e.property === 'name')).toBeDefined();
    });

    it('should reject expiresInDays outside 1..365 bounds', async () => {
      const zeroDto = plainToInstance(CreateMcpTokenDto, { name: 'Token', expiresInDays: 0 });
      const zeroErrors = await validate(zeroDto);
      expect(zeroErrors.find((e) => e.property === 'expiresInDays')).toBeDefined();

      const hugeDto = plainToInstance(CreateMcpTokenDto, { name: 'Token', expiresInDays: 366 });
      const hugeErrors = await validate(hugeDto);
      expect(hugeErrors.find((e) => e.property === 'expiresInDays')).toBeDefined();
    });
  });

  describe('TokenBlacklistService.addHash', () => {
    it('should register a pre-hashed SHA-256 token and mark corresponding raw token as blacklisted', async () => {
      const mockPrisma = {
        revokedToken: {
          upsert: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn().mockResolvedValue(null),
        },
      } as any;
      const blacklist = new TokenBlacklistService(mockPrisma);

      const rawToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mcp-test-payload.sig';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60_000);

      await blacklist.addHash(tokenHash, expiresAt);

      expect(mockPrisma.revokedToken.upsert).toHaveBeenCalledWith({
        where: { tokenHash },
        create: { tokenHash, expiresAt },
        update: { expiresAt },
      });
      await expect(blacklist.isBlacklisted(rawToken)).resolves.toBe(true);
    });
  });

  describe('AuthService & AuthController MCP Token Lifecycle', () => {
    let authService: AuthService;
    let authController: AuthController;
    let mockUsersService: any;
    let mockJwtService: any;
    let mockPrisma: any;
    let blacklistService: TokenBlacklistService;

    beforeEach(() => {
      mockUsersService = {
        findByEmail: jest.fn(),
        create: jest.fn(),
      };
      mockJwtService = {
        sign: jest.fn().mockReturnValue('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature123456'),
      };
      mockPrisma = {
        revokedToken: {
          upsert: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn().mockResolvedValue(null),
        },
        mcpApiToken: {
          create: jest.fn().mockImplementation(({ data }) =>
            Promise.resolve({
              id: 'token-uuid-1',
              userId: data.userId,
              name: data.name,
              tokenHash: data.tokenHash,
              tokenPrefix: data.tokenPrefix,
              expiresAt: data.expiresAt,
              lastUsedAt: null,
              revokedAt: null,
              createdAt: new Date('2026-10-16T12:00:00.000Z'),
            }),
          ),
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'token-uuid-1',
              name: 'Claude Desktop',
              tokenPrefix: 'eyJhbGciOi...3456',
              expiresAt: new Date('2027-01-14T12:00:00.000Z'),
              lastUsedAt: null,
              revokedAt: null,
              createdAt: new Date('2026-10-16T12:00:00.000Z'),
            },
          ]),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      };
      blacklistService = new TokenBlacklistService(mockPrisma);
      authService = new AuthService(
        mockUsersService,
        mockJwtService,
        mockPrisma,
        blacklistService,
      );
      authController = new AuthController(authService, blacklistService);
    });

    it('AC1 (MCP-01): should sign JWT, persist only SHA-256 tokenHash in mcp_api_tokens, and return raw token once', async () => {
      const result = await authController.createMcpToken(
        { id: 'user-1', email: 'admin@exemplo.com' },
        { name: 'Claude Desktop', expiresInDays: 30 },
      );

      const expectedToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature123456';
      const expectedHash = crypto.createHash('sha256').update(expectedToken).digest('hex');

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          email: 'admin@exemplo.com',
          type: 'mcp_pat',
        }),
        { expiresIn: '30d' },
      );

      expect(mockPrisma.mcpApiToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'Claude Desktop',
          tokenHash: expectedHash,
        }),
      });

      expect(result.id).toBe('token-uuid-1');
      expect(result.clientId).toBe('token-uuid-1');
      expect(result.clientSecret).toBe(expectedToken);
      expect(result.name).toBe('Claude Desktop');
      expect(result.token).toBe(expectedToken);
      expect(result.tokenPrefix).toContain('eyJhbGci');
      expect((result as any).tokenHash).toBeUndefined();
    });

    it('AC2 (MCP-01): should list only tokens owned by the user without exposing tokenHash or raw token', async () => {
      const list = await authController.listMcpTokens('user-1');

      expect(mockPrisma.mcpApiToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          tokenPrefix: true,
          expiresAt: true,
          lastUsedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      });
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('token-uuid-1');
      expect(list[0].name).toBe('Claude Desktop');
      expect((list[0] as any).tokenHash).toBeUndefined();
      expect((list[0] as any).token).toBeUndefined();
    });

    it('AC3 (MCP-02): should revoke owned token by setting revokedAt and adding tokenHash to TokenBlacklistService', async () => {
      const rawToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature123456';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const futureExpiry = new Date(Date.now() + 86_400_000);

      mockPrisma.mcpApiToken.findUnique.mockResolvedValue({
        id: 'token-uuid-1',
        userId: 'user-1',
        name: 'Claude Desktop',
        tokenHash,
        expiresAt: futureExpiry,
        revokedAt: null,
      });
      mockPrisma.mcpApiToken.update.mockResolvedValue({
        id: 'token-uuid-1',
        revokedAt: new Date(),
      });

      const response = await authController.revokeMcpToken('user-1', 'token-uuid-1');

      expect(mockPrisma.mcpApiToken.update).toHaveBeenCalledWith({
        where: { id: 'token-uuid-1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(response).toEqual({ message: 'Token MCP revogado com sucesso' });
      await expect(blacklistService.isBlacklisted(rawToken)).resolves.toBe(true);
    });

    it('AC4 (MCP-02): should reject revocation when token does not exist or belongs to another user (BOLA protection)', async () => {
      mockPrisma.mcpApiToken.findUnique.mockResolvedValue(null);
      await expect(authController.revokeMcpToken('user-1', 'missing-id')).rejects.toThrow(
        NotFoundException,
      );

      mockPrisma.mcpApiToken.findUnique.mockResolvedValue({
        id: 'token-uuid-2',
        userId: 'other-user-99',
        name: 'Other User Token',
        tokenHash: 'hash-99',
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: null,
      });

      await expect(authController.revokeMcpToken('user-1', 'token-uuid-2')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.mcpApiToken.update).not.toHaveBeenCalled();
    });

    it('AC5 (MCP-11): should verify valid OAuth clientId + clientSecret and reject invalid or revoked ones', async () => {
      const rawToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature123456';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const futureExpiry = new Date(Date.now() + 86_400_000);

      mockPrisma.mcpApiToken.findUnique.mockResolvedValue({
        id: 'token-uuid-1',
        userId: 'user-1',
        name: 'Google Gemini',
        tokenHash,
        expiresAt: futureExpiry,
        revokedAt: null,
      });
      mockPrisma.mcpApiToken.update.mockResolvedValue({
        id: 'token-uuid-1',
        lastUsedAt: new Date(),
      });

      const verified = await authController.verifyMcpOAuthClient({
        clientId: 'token-uuid-1',
        clientSecret: rawToken,
      });

      expect(verified).toEqual({
        valid: true,
        clientId: 'token-uuid-1',
        userId: 'user-1',
        accessToken: rawToken,
        expiresAt: futureExpiry,
      });

      await expect(
        authController.verifyMcpOAuthClient({
          clientId: 'token-uuid-1',
          clientSecret: 'wrong-secret',
        }),
      ).rejects.toThrow();
    });
  });
});

