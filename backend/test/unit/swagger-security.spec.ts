import { isSwaggerEnabled } from '../../src/common/utils/swagger.util';

describe('Swagger Documentation Suppression in Production (SEC-MED-07)', () => {
  const originalAppEnv = process.env.APP_ENV;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalAppEnv !== undefined) {
      process.env.APP_ENV = originalAppEnv;
    } else {
      delete process.env.APP_ENV;
    }

    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  it('should disable Swagger when APP_ENV is production', () => {
    process.env.APP_ENV = 'production';
    delete process.env.NODE_ENV;
    expect(isSwaggerEnabled()).toBe(false);
  });

  it('should disable Swagger when NODE_ENV is production', () => {
    delete process.env.APP_ENV;
    process.env.NODE_ENV = 'production';
    expect(isSwaggerEnabled()).toBe(false);
  });

  it('should disable Swagger when both APP_ENV and NODE_ENV are production', () => {
    process.env.APP_ENV = 'production';
    process.env.NODE_ENV = 'production';
    expect(isSwaggerEnabled()).toBe(false);
  });

  it('should enable Swagger in development environment', () => {
    process.env.APP_ENV = 'development';
    process.env.NODE_ENV = 'development';
    expect(isSwaggerEnabled()).toBe(true);
  });

  it('should enable Swagger by default when neither variable is production', () => {
    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;
    expect(isSwaggerEnabled()).toBe(true);
  });
});
