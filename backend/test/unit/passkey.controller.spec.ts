import { Test, TestingModule } from '@nestjs/testing';
import { PasskeyController } from '../../src/modules/auth/passkey.controller';
import { PasskeyService } from '../../src/modules/auth/passkey.service';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';

describe('PasskeyController', () => {
  let controller: PasskeyController;
  let service: any;

  const mockPasskeyService = {
    generateRegistrationOptions: jest.fn(),
    verifyRegistration: jest.fn(),
    generateAuthenticationOptions: jest.fn(),
    verifyAuthentication: jest.fn(),
    listUserCredentials: jest.fn(),
    deleteCredential: jest.fn(),
  };

  const mockUser = {
    id: 'user-uuid-1',
    email: 'teste@fin.com',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PasskeyController],
      providers: [
        { provide: PasskeyService, useValue: mockPasskeyService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PasskeyController>(PasskeyController);
    service = module.get<PasskeyService>(PasskeyService);
  });

  describe('getRegisterOptions', () => {
    it('deve chamar generateRegistrationOptions com dados do usuário', async () => {
      mockPasskeyService.generateRegistrationOptions.mockResolvedValue({ challenge: 'test-chal' });

      const res = await controller.getRegisterOptions(mockUser);

      expect(service.generateRegistrationOptions).toHaveBeenCalledWith('user-uuid-1', 'teste@fin.com');
      expect(res).toEqual({ challenge: 'test-chal' });
    });
  });

  describe('verifyRegistration', () => {
    it('deve repassar resposta ao serviço e retornar resultado', async () => {
      const body = { response: {}, deviceName: 'Android' };
      mockPasskeyService.verifyRegistration.mockResolvedValue({ verified: true, credentialId: 'c-1' });

      const res = await controller.verifyRegistration(mockUser, body);

      expect(service.verifyRegistration).toHaveBeenCalledWith('user-uuid-1', body);
      expect(res.verified).toBe(true);
    });
  });

  describe('getLoginOptions', () => {
    it('deve retornar opções públicas de login biométrico', async () => {
      mockPasskeyService.generateAuthenticationOptions.mockResolvedValue({ challenge: 'login-chal' });

      const res = await controller.getLoginOptions();

      expect(service.generateAuthenticationOptions).toHaveBeenCalled();
      expect(res).toEqual({ challenge: 'login-chal' });
    });
  });

  describe('verifyLogin', () => {
    it('deve autenticar e retornar tokens do usuário', async () => {
      const body = { id: 'cred-1', response: {} };
      mockPasskeyService.verifyAuthentication.mockResolvedValue({
        user: { id: 'user-uuid-1', email: 'teste@fin.com' },
        accessToken: 'jwt-token-123',
      });

      const res = await controller.verifyLogin(body);

      expect(service.verifyAuthentication).toHaveBeenCalledWith(body);
      expect(res.accessToken).toBe('jwt-token-123');
    });
  });

  describe('listCredentials', () => {
    it('deve retornar lista de credenciais cadastradas do usuário', async () => {
      mockPasskeyService.listUserCredentials.mockResolvedValue([
        { id: '1', deviceName: 'iPhone 15' },
      ]);

      const res = await controller.listCredentials(mockUser);

      expect(service.listUserCredentials).toHaveBeenCalledWith('user-uuid-1');
      expect(res).toHaveLength(1);
    });
  });

  describe('deleteCredential', () => {
    it('deve excluir credencial especificada pelo ID', async () => {
      mockPasskeyService.deleteCredential.mockResolvedValue({ message: 'removida' });

      const res = await controller.deleteCredential(mockUser, 'cred-to-delete');

      expect(service.deleteCredential).toHaveBeenCalledWith('user-uuid-1', 'cred-to-delete');
      expect(res.message).toBe('removida');
    });
  });
});
