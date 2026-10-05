import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PasskeyService } from '../../src/modules/auth/passkey.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as simpleWebAuthn from '@simplewebauthn/server';

jest.mock('@simplewebauthn/server');

describe('PasskeyService', () => {
  let service: PasskeyService;
  let prisma: any;
  let jwtService: any;

  const mockPrismaService = {
    authChallenge: {
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    userPasskey: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasskeyService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<PasskeyService>(PasskeyService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('generateRegistrationOptions', () => {
    it('deve gerar opções de registro WebAuthn e salvar o challenge no banco', async () => {
      prisma.authChallenge.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userPasskey.findMany.mockResolvedValue([]);
      (simpleWebAuthn.generateRegistrationOptions as jest.Mock).mockResolvedValue({
        challenge: 'test-challenge-123',
        rp: { name: 'Financeiro Familiar', id: 'localhost' },
      });
      prisma.authChallenge.create.mockResolvedValue({ id: 'c-1' });

      const result = await service.generateRegistrationOptions('user-1', 'teste@fin.com');

      expect(prisma.authChallenge.deleteMany).toHaveBeenCalled();
      expect(prisma.userPasskey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { credentialId: true, transports: true },
      });
      expect(prisma.authChallenge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            challenge: 'test-challenge-123',
          }),
        }),
      );
      expect(result.challenge).toBe('test-challenge-123');
    });
  });

  describe('verifyRegistration', () => {
    it('deve lançar BadRequestException se body ou response forem ausentes', async () => {
      await expect(service.verifyRegistration('user-1', null)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar UnauthorizedException se não encontrar o challenge ativo', async () => {
      prisma.authChallenge.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyRegistration('user-1', { response: {} }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve salvar a credencial com sucesso quando a verificação for válida', async () => {
      prisma.authChallenge.findFirst.mockResolvedValue({
        id: 'c-1',
        challenge: 'valid-challenge',
        expiresAt: new Date(Date.now() + 60000),
      });

      (simpleWebAuthn.verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialID: 'cred-123',
          credentialPublicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
          deviceType: 'singleDevice',
          backedUp: false,
        },
      });

      prisma.authChallenge.delete.mockResolvedValue({ id: 'c-1' });
      prisma.userPasskey.create.mockResolvedValue({
        credentialId: 'cred-123',
        deviceName: 'Meu Celular',
      });

      const result = await service.verifyRegistration('user-1', {
        response: { transports: ['internal'] },
        deviceName: 'Meu Celular',
      });

      expect(result.verified).toBe(true);
      expect(result.credentialId).toBe('cred-123');
      expect(prisma.userPasskey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            credentialId: 'cred-123',
            counter: BigInt(0),
            deviceName: 'Meu Celular',
          }),
        }),
      );
    });

    it('deve lançar UnauthorizedException se a verificação falhar', async () => {
      prisma.authChallenge.findFirst.mockResolvedValue({
        id: 'c-1',
        challenge: 'valid-challenge',
        expiresAt: new Date(Date.now() + 60000),
      });

      (simpleWebAuthn.verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: false,
      });

      await expect(
        service.verifyRegistration('user-1', { response: {} }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateAuthenticationOptions', () => {
    it('deve gerar opções de login e salvar challenge no banco', async () => {
      prisma.authChallenge.deleteMany.mockResolvedValue({ count: 0 });
      (simpleWebAuthn.generateAuthenticationOptions as jest.Mock).mockResolvedValue({
        challenge: 'login-challenge-456',
        rpID: 'localhost',
      });
      prisma.authChallenge.create.mockResolvedValue({ id: 'c-2' });

      const result = await service.generateAuthenticationOptions();

      expect(result.challenge).toBe('login-challenge-456');
      expect(prisma.authChallenge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: null,
            challenge: 'login-challenge-456',
          }),
        }),
      );
    });
  });

  describe('verifyAuthentication', () => {
    const clientDataJSON = Buffer.from(
      JSON.stringify({ challenge: 'auth-challenge-789' }),
    ).toString('base64url');

    it('deve lançar UnauthorizedException se a credencial não for encontrada', async () => {
      prisma.userPasskey.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyAuthentication({
          id: 'unknown-cred',
          response: { clientDataJSON },
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se o challenge não existir ou estiver expirado', async () => {
      prisma.userPasskey.findUnique.mockResolvedValue({
        id: 'pk-1',
        credentialId: 'cred-1',
        publicKey: Buffer.from([1, 2, 3]),
        counter: BigInt(0),
        user: { id: 'u-1', email: 'u@test.com' },
      });

      prisma.authChallenge.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyAuthentication({
          id: 'cred-1',
          response: { clientDataJSON },
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se replay attack for detectado (counter menor ou igual)', async () => {
      prisma.userPasskey.findUnique.mockResolvedValue({
        id: 'pk-1',
        credentialId: 'cred-1',
        publicKey: Buffer.from([1, 2, 3]),
        counter: BigInt(5),
        user: { id: 'u-1', email: 'u@test.com' },
      });

      prisma.authChallenge.findUnique.mockResolvedValue({
        id: 'c-auth',
        challenge: 'auth-challenge-789',
        expiresAt: new Date(Date.now() + 60000),
      });

      (simpleWebAuthn.verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 4 }, // Menor que o counter atual (5)
      });

      await expect(
        service.verifyAuthentication({
          id: 'cred-1',
          response: { clientDataJSON },
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve autenticar e retornar JWT e dados do usuário quando a validação for bem-sucedida', async () => {
      prisma.userPasskey.findUnique.mockResolvedValue({
        id: 'pk-1',
        credentialId: 'cred-1',
        publicKey: Buffer.from([1, 2, 3]),
        counter: BigInt(1),
        user: {
          id: 'u-1',
          name: 'João Silva',
          email: 'joao@test.com',
          avatarUrl: null,
          memberships: [],
        },
      });

      prisma.authChallenge.findUnique.mockResolvedValue({
        id: 'c-auth',
        challenge: 'auth-challenge-789',
        expiresAt: new Date(Date.now() + 60000),
      });

      (simpleWebAuthn.verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 2 },
      });

      prisma.userPasskey.update.mockResolvedValue({});
      prisma.authChallenge.delete.mockResolvedValue({});

      const result = await service.verifyAuthentication({
        id: 'cred-1',
        response: { clientDataJSON },
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('joao@test.com');
      expect(prisma.userPasskey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pk-1' },
          data: expect.objectContaining({ counter: BigInt(2) }),
        }),
      );
    });
  });

  describe('listUserCredentials', () => {
    it('deve listar as credenciais formatando counter para Number', async () => {
      prisma.userPasskey.findMany.mockResolvedValue([
        {
          id: 'p-1',
          credentialId: 'cred-1',
          deviceName: 'Galaxy S23',
          counter: BigInt(3),
        },
      ]);

      const list = await service.listUserCredentials('user-1');

      expect(list).toHaveLength(1);
      expect(list[0].counter).toBe(3);
    });
  });

  describe('deleteCredential', () => {
    it('deve lançar NotFoundException se a credencial não for do usuário', async () => {
      prisma.userPasskey.findFirst.mockResolvedValue(null);

      await expect(service.deleteCredential('u-1', 'cred-x')).rejects.toThrow(NotFoundException);
    });

    it('deve remover a credencial com sucesso', async () => {
      prisma.userPasskey.findFirst.mockResolvedValue({ id: 'cred-1' });
      prisma.userPasskey.delete.mockResolvedValue({ id: 'cred-1' });

      const res = await service.deleteCredential('u-1', 'cred-1');

      expect(res.message).toContain('removida com sucesso');
      expect(prisma.userPasskey.delete).toHaveBeenCalledWith({ where: { id: 'cred-1' } });
    });
  });
});
