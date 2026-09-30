import { validateJwtSecret } from '../../src/modules/auth/auth.module';
import { JwtStrategy } from '../../src/modules/auth/jwt.strategy';
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
});
