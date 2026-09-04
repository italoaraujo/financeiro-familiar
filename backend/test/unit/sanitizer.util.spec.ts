import { sanitizePayload } from '../../src/common/utils/sanitizer.util';

describe('SanitizerUtil - sanitizePayload', () => {
  it('deve retornar tipos primitivos sem alteração', () => {
    expect(sanitizePayload(null)).toBeNull();
    expect(sanitizePayload(undefined)).toBeUndefined();
    expect(sanitizePayload('texto normal')).toBe('texto normal');
    expect(sanitizePayload(12345)).toBe(12345);
    expect(sanitizePayload(true)).toBe(true);
  });

  it('deve mascarar campos sensíveis em objetos planos', () => {
    const input = {
      name: 'João Silva',
      email: 'joao@example.com',
      password: 'minhasenhasecreta123',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
      token: 'jwt.token.here',
      refreshToken: 'refresh.token.here',
    };

    const result = sanitizePayload(input);

    expect(result.name).toBe('João Silva');
    expect(result.email).toBe('joao@example.com');
    expect(result.password).toBe('[REDACTED]');
    expect(result.passwordHash).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.refreshToken).toBe('[REDACTED]');
  });

  it('deve mascarar recursivamente em objetos aninhados', () => {
    const input = {
      user: {
        id: '123',
        profile: {
          password: 'secret_password',
          apiKey: 'key_12345',
        },
      },
      action: 'UPDATE_PROFILE',
    };

    const result = sanitizePayload(input);

    expect(result.user.id).toBe('123');
    expect(result.user.profile.password).toBe('[REDACTED]');
    expect(result.user.profile.apiKey).toBe('[REDACTED]');
    expect(result.action).toBe('UPDATE_PROFILE');
  });

  it('deve mascarar objetos contidos em arrays', () => {
    const input = [
      { id: 1, secret: 'segredo1' },
      { id: 2, secret: 'segredo2', name: 'Item 2' },
    ];

    const result = sanitizePayload(input);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[0].secret).toBe('[REDACTED]');
    expect(result[1].name).toBe('Item 2');
    expect(result[1].secret).toBe('[REDACTED]');
  });

  it('deve lidar com referências circulares sem estourar pilha de execução', () => {
    const circularObj: any = { name: 'Ciclo', password: '123' };
    circularObj.self = circularObj;

    const result = sanitizePayload(circularObj);

    expect(result.name).toBe('Ciclo');
    expect(result.password).toBe('[REDACTED]');
    expect(result.self).toBe('[CIRCULAR]');
  });

  it('deve ignorar case sensitive em chaves sensíveis (ex: Password, TOKEN)', () => {
    const input = {
      Password: 'senha1',
      TOKEN: 'token2',
      Authorization: 'Bearer 12345',
    };

    const result = sanitizePayload(input);

    expect(result.Password).toBe('[REDACTED]');
    expect(result.TOKEN).toBe('[REDACTED]');
    expect(result.Authorization).toBe('[REDACTED]');
  });
});
