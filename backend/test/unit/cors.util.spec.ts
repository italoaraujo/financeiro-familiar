import { getAllowedCorsOrigins } from '../../src/common/utils/cors.util';

describe('CORS Configuration Security (SEC-HIGH-04)', () => {
  const originalEnv = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ALLOWED_ORIGINS = originalEnv;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
  });

  it('should return safe localhost defaults when ALLOWED_ORIGINS is not set or empty', () => {
    delete process.env.ALLOWED_ORIGINS;
    expect(getAllowedCorsOrigins(undefined)).toEqual(['http://localhost:3000', 'http://localhost:3001']);
    expect(getAllowedCorsOrigins('')).toEqual(['http://localhost:3000', 'http://localhost:3001']);
    expect(getAllowedCorsOrigins('   ')).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });

  it('should parse comma-separated origins and trim whitespace', () => {
    const input = 'https://financeiro.app , https://admin.financeiro.app ';
    expect(getAllowedCorsOrigins(input)).toEqual([
      'https://financeiro.app',
      'https://admin.financeiro.app',
    ]);
  });

  it('should discard wildcard * to prevent unsafe origin * with credentials', () => {
    expect(getAllowedCorsOrigins('*')).toEqual(['http://localhost:3000', 'http://localhost:3001']);
    expect(getAllowedCorsOrigins('*, https://financeiro.app')).toEqual(['https://financeiro.app']);
  });
});
