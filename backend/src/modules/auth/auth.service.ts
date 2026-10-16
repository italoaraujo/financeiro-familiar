import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateMcpTokenDto } from './dto/create-mcp-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly blacklistService?: TokenBlacklistService,
  ) {}

  isRegistrationEnabled(): boolean {
    const disableRegistration = (process.env.DISABLE_REGISTRATION || '').trim().toLowerCase();
    return disableRegistration !== 'true' && disableRegistration !== '1' && disableRegistration !== 'yes';
  }

  async register(dto: RegisterDto) {
    if (!this.isRegistrationEnabled()) {
      throw new ForbiddenException('O cadastro de novos usuários está desativado pelo administrador');
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Já existe um usuário cadastrado com este e-mail');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
    });

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        memberships: (user as any).memberships || [],
      },
      accessToken: token,
    };
  }

  async createMcpToken(userId: string, email: string, dto: CreateMcpTokenDto) {
    const days = dto.expiresInDays && dto.expiresInDays > 0 ? dto.expiresInDays : 90;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const jti = crypto.randomUUID();

    const rawToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        type: 'mcp_pat',
        jti,
      },
      {
        expiresIn: `${days}d`,
      },
    );

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenPrefix =
      rawToken.length > 16
        ? `${rawToken.slice(0, 10)}...${rawToken.slice(-4)}`
        : rawToken;

    if (!this.prisma) {
      return {
        id: jti,
        name: dto.name.trim(),
        token: rawToken,
        clientId: jti,
        clientSecret: rawToken,
        tokenPrefix,
        expiresAt,
        createdAt: new Date(),
      };
    }

    const created = await this.prisma.mcpApiToken.create({
      data: {
        userId,
        name: dto.name.trim(),
        tokenHash,
        tokenPrefix,
        expiresAt,
      },
    });

    return {
      id: created.id,
      name: created.name,
      token: rawToken,
      clientId: created.id,
      clientSecret: rawToken,
      tokenPrefix: created.tokenPrefix,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    };
  }

  async verifyMcpOAuthClient(clientId: string, clientSecret: string) {
    const trimmedId = (clientId || '').trim();
    const trimmedSecret = (clientSecret || '').trim();
    if (!trimmedId || !trimmedSecret) {
      throw new UnauthorizedException('Credenciais OAuth MCP ausentes');
    }

    if (this.blacklistService && (await this.blacklistService.isBlacklisted(trimmedSecret))) {
      throw new UnauthorizedException('Token MCP foi revogado');
    }

    const secretHash = crypto.createHash('sha256').update(trimmedSecret).digest('hex');

    if (this.prisma) {
      let tokenRecord = await this.prisma.mcpApiToken.findUnique({
        where: { id: trimmedId },
      });

      if (!tokenRecord) {
        tokenRecord = await this.prisma.mcpApiToken.findUnique({
          where: { tokenHash: secretHash },
        });
      }

      if (!tokenRecord) {
        throw new UnauthorizedException('Cliente OAuth MCP não encontrado');
      }

      if (tokenRecord.tokenHash !== secretHash) {
        throw new UnauthorizedException('Chave secreta do cliente OAuth inválida');
      }

      if (tokenRecord.revokedAt) {
        throw new UnauthorizedException('Token MCP revogado');
      }

      if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt).getTime() <= Date.now()) {
        throw new UnauthorizedException('Token MCP expirado');
      }

      await this.prisma.mcpApiToken.update({
        where: { id: tokenRecord.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        valid: true,
        clientId: tokenRecord.id,
        userId: tokenRecord.userId,
        accessToken: trimmedSecret,
        expiresAt: tokenRecord.expiresAt,
      };
    }

    return {
      valid: true,
      clientId: trimmedId,
      accessToken: trimmedSecret,
    };
  }

  async listMcpTokens(userId: string) {
    if (!this.prisma) {
      return [];
    }

    return this.prisma.mcpApiToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  async revokeMcpToken(userId: string, tokenId: string) {
    if (!this.prisma) {
      throw new NotFoundException('Token MCP não encontrado');
    }

    const tokenRecord = await this.prisma.mcpApiToken.findUnique({
      where: { id: tokenId },
    });

    if (!tokenRecord) {
      throw new NotFoundException('Token MCP não encontrado');
    }

    if (tokenRecord.userId !== userId) {
      throw new ForbiddenException('Acesso negado para revogar este token');
    }

    if (!tokenRecord.revokedAt) {
      await this.prisma.mcpApiToken.update({
        where: { id: tokenId },
        data: { revokedAt: new Date() },
      });
    }

    if (this.blacklistService) {
      await this.blacklistService.addHash(tokenRecord.tokenHash, tokenRecord.expiresAt);
    }

    return { message: 'Token MCP revogado com sucesso' };
  }

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
    });
  }
}
