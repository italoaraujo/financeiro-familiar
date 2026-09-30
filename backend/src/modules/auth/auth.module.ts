import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';

export function validateJwtSecret(secret?: string): string {
  const resolvedSecret = arguments.length > 0 ? secret : process.env.JWT_SECRET;
  if (!resolvedSecret || resolvedSecret.length < 32 || resolvedSecret.includes('supersecret')) {
    throw new Error('FATAL: A variável JWT_SECRET deve ser configurada com no mínimo 32 caracteres seguros.');
  }
  return resolvedSecret;
}

const jwtSecret = validateJwtSecret();

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        expiresIn: '1d',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
