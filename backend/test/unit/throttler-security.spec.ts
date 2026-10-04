import { AuthController } from '../../src/modules/auth/auth.controller';
import { AppModule } from '../../src/app.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

describe('Throttler Rate Limiting Security (SEC-HIGH-03)', () => {
  it('should have ThrottlerGuard registered as global APP_GUARD in AppModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    const providers = Reflect.getMetadata('providers', AppModule);

    const hasThrottlerModule = imports.some(
      (imp: any) => imp === ThrottlerModule || imp?.module === ThrottlerModule,
    );
    expect(hasThrottlerModule).toBe(true);

    const hasAppGuard = providers.some(
      (provider: any) =>
        provider?.provide === APP_GUARD && provider?.useClass === ThrottlerGuard,
    );
    expect(hasAppGuard).toBe(true);
  });

  it('should configure strict rate limit (5 req/min) on register and login endpoints', () => {
    const registerLimit = Reflect.getMetadata('THROTTLER:LIMITdefault', AuthController.prototype.register);
    const registerTtl = Reflect.getMetadata('THROTTLER:TTLdefault', AuthController.prototype.register);

    expect(registerLimit).toBe(5);
    expect(registerTtl).toBe(60000);

    const loginLimit = Reflect.getMetadata('THROTTLER:LIMITdefault', AuthController.prototype.login);
    const loginTtl = Reflect.getMetadata('THROTTLER:TTLdefault', AuthController.prototype.login);

    expect(loginLimit).toBe(5);
    expect(loginTtl).toBe(60000);
  });
});
