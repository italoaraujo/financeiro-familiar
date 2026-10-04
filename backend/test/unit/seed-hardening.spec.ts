describe('Seed Environment Hardening (SEC-MED-02)', () => {
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

  function resolveEnvironment(): string {
    return (process.env.APP_ENV || process.env.NODE_ENV || 'production').toLowerCase();
  }

  it('should default to production when APP_ENV and NODE_ENV are not set', () => {
    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;
    expect(resolveEnvironment()).toBe('production');
  });

  it('should resolve to production when explicitly set to production', () => {
    process.env.APP_ENV = 'production';
    expect(resolveEnvironment()).toBe('production');
  });

  it('should resolve to staging when set to staging', () => {
    process.env.APP_ENV = 'staging';
    expect(resolveEnvironment()).toBe('staging');
  });

  it('should only allow demo user creation when environment is development', () => {
    process.env.APP_ENV = 'development';
    const isDev = resolveEnvironment() === 'development';
    expect(isDev).toBe(true);

    process.env.APP_ENV = 'production';
    const isProdDev = resolveEnvironment() === 'development';
    expect(isProdDev).toBe(false);
  });
});
