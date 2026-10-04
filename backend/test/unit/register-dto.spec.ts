import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from '../../src/modules/auth/dto/register.dto';

describe('RegisterDto Password Policy Validation (PWD-01 to PWD-09)', () => {
  function createDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
    return plainToInstance(RegisterDto, {
      name: 'Maria Silva',
      email: 'maria@email.com',
      password: 'StrongPassword@123',
      ...overrides,
    });
  }

  it('should pass validation with a strong password meeting all 8 criteria', async () => {
    const dto = createDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  describe('Rule 1: Length between 10 and 128 characters', () => {
    it('should fail when password has fewer than 10 characters', async () => {
      const dto = createDto({ password: 'Pass@123' }); // 8 chars
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.minLength).toBe('A senha deve ter no mínimo 10 caracteres');
    });

    it('should fail when password exceeds 128 characters', async () => {
      const dto = createDto({ password: 'A'.repeat(126) + 'a1!' }); // 129 chars
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.maxLength).toBe('A senha não pode exceder 128 caracteres');
    });

    it('should pass with exactly 10 characters meeting other criteria', async () => {
      const dto = createDto({ password: 'Abcd#12345' }); // exactly 10 chars
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with exactly 128 characters meeting other criteria', async () => {
      const dto = createDto({ password: 'A'.repeat(124) + 'a1!#' }); // exactly 128 chars
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Rule 2: At least 1 uppercase letter', () => {
    it('should fail when password has no uppercase letters', async () => {
      const dto = createDto({ password: 'lowercase@123' });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toBe('A senha deve conter ao menos uma letra maiúscula');
    });
  });

  describe('Rule 3: At least 1 lowercase letter', () => {
    it('should fail when password has no lowercase letters', async () => {
      const dto = createDto({ password: 'UPPERCASE@123' });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toBe('A senha deve conter ao menos uma letra minúscula');
    });
  });

  describe('Rule 4: At least 1 number', () => {
    it('should fail when password has no numbers', async () => {
      const dto = createDto({ password: 'OnlyLetters@Special' });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toBe('A senha deve conter ao menos um número');
    });
  });

  describe('Rule 5: At least 1 special character', () => {
    it('should fail when password has no special character', async () => {
      const dto = createDto({ password: 'StrongPassword123' });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toBe('A senha deve conter ao menos um caractere especial');
    });

    it('should accept various special characters', async () => {
      const chars = ['!', '@', '#', '$', '%', '&', '*', '_', '-', '+', '=', '?'];
      for (const char of chars) {
        const dto = createDto({ password: `StrongPass${char}123` });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });
  });

  describe('Rule 6: No whitespace allowed', () => {
    it('should fail when password has whitespace in the middle', async () => {
      const dto = createDto({ password: 'Strong Pass@123' });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toBe('A senha não pode conter espaços');
    });

    it('should fail when password has leading whitespace', async () => {
      const dto = createDto({ password: ' StrongPass@123' });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toBe('A senha não pode conter espaços');
    });

    it('should fail when password has trailing whitespace', async () => {
      const dto = createDto({ password: 'StrongPass@123 ' });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toBe('A senha não pode conter espaços');
    });
  });

  describe('Rule 7: Not equal to user/login identifiers', () => {
    it('should fail when password equals the exact email', async () => {
      const dto = createDto({
        email: 'maria@email.com',
        password: 'maria@email.com',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.IsNotEqualToUserLogin).toBe(
        'A senha não pode ser igual ao usuário, e-mail ou nome',
      );
    });

    it('should fail when password equals email with different case', async () => {
      const dto = createDto({
        email: 'maria@email.com',
        password: 'Maria@Email.com',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.IsNotEqualToUserLogin).toBe(
        'A senha não pode ser igual ao usuário, e-mail ou nome',
      );
    });

    it('should fail when password equals the email username prefix', async () => {
      const dto = createDto({
        email: 'mariasilva@email.com',
        password: 'mariasilva',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.IsNotEqualToUserLogin).toBe(
        'A senha não pode ser igual ao usuário, e-mail ou nome',
      );
    });

    it('should fail when password equals the registered user name', async () => {
      const dto = createDto({
        name: 'Maria Silva',
        password: 'Maria Silva',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.IsNotEqualToUserLogin).toBe(
        'A senha não pode ser igual ao usuário, e-mail ou nome',
      );
    });
  });

  describe('Rule 8: Not in common passwords list', () => {
    it('should fail when password is in common passwords list', async () => {
      const commonList = ['password123!', 'Admin12345!', 'qwerty1234!', 'financeiro123!', 'brasil1234!'];
      for (const commonPwd of commonList) {
        const dto = createDto({ password: commonPwd });
        const errors = await validate(dto);
        const passwordError = errors.find((e) => e.property === 'password');
        expect(passwordError).toBeDefined();
        expect(passwordError?.constraints?.IsNotCommonPassword).toBe(
          'A senha não pode estar na lista de senhas comuns',
        );
      }
    });
  });

  describe('General field bounds', () => {
    it('should fail when name exceeds 100 characters', async () => {
      const dto = createDto({ name: 'A'.repeat(101) });
      const errors = await validate(dto);
      const nameError = errors.find((e) => e.property === 'name');
      expect(nameError).toBeDefined();
      expect(nameError?.constraints?.maxLength).toBe('Nome não pode exceder 100 caracteres');
    });

    it('should fail when email exceeds 150 characters', async () => {
      const longLocal = 'a'.repeat(145);
      const dto = createDto({ email: `${longLocal}@email.com` });
      const errors = await validate(dto);
      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints?.maxLength).toBe('E-mail não pode exceder 150 caracteres');
    });

    it('should fail when email is invalid', async () => {
      const dto = createDto({ email: 'not-an-email' });
      const errors = await validate(dto);
      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints?.isEmail).toBe('E-mail inválido');
    });
  });
});
