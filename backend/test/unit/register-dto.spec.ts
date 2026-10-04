import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from '../../src/modules/auth/dto/register.dto';

describe('RegisterDto Validation (SEC-MED-07 / SEC-MED-06)', () => {
  function createDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
    return plainToInstance(RegisterDto, {
      name: 'Maria Silva',
      email: 'maria@email.com',
      password: 'StrongPassword123',
      ...overrides,
    });
  }

  it('should pass validation with valid password meeting complexity criteria', async () => {
    const dto = createDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when password has fewer than 8 characters', async () => {
    const dto = createDto({ password: 'Pass1' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints?.minLength).toBe('A senha deve ter no mínimo 8 caracteres');
  });

  it('should fail when password exceeds 72 characters', async () => {
    const dto = createDto({ password: 'A'.repeat(72) + '123' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints?.maxLength).toBe('A senha não pode exceder 72 caracteres');
  });

  it('should fail when password has no digits', async () => {
    const dto = createDto({ password: 'OnlyLettersNoDigits' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints?.matches).toBe('A senha deve conter ao menos uma letra e um número');
  });

  it('should fail when password has no letters', async () => {
    const dto = createDto({ password: '1234567890' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError?.constraints?.matches).toBe('A senha deve conter ao menos uma letra e um número');
  });

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
});
