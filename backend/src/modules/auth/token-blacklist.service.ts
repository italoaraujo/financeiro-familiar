import { Injectable, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TokenBlacklistService {
  private readonly memoryBlacklist = new Map<string, number>();

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /**
   * Gera hash SHA-256 do token para não expor o JWT bruto no banco de dados.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Adiciona um token à blacklist com prazo de expiração (TTL em milissegundos).
   * Padrão: 24 horas (tempo padrão de vida de um token na aplicação).
   * Persiste em memória para acesso imediato e no PostgreSQL para durabilidade.
   */
  async add(token: string, ttlMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    if (!token) return;
    const tokenHash = this.hashToken(token);
    const expiresAtMs = Date.now() + ttlMs;
    const expiresAt = new Date(expiresAtMs);

    this.memoryBlacklist.set(tokenHash, expiresAtMs);

    if (this.prisma) {
      try {
        await this.prisma.revokedToken.upsert({
          where: { tokenHash },
          create: { tokenHash, expiresAt },
          update: { expiresAt },
        });
      } catch (err) {
        // Fallback defensivo mantendo cache em memória se banco falhar
      }
    }
  }

  /**
   * Verifica se o token informado está na blacklist de tokens revogados.
   * Checa primeiro o cache em memória; caso não esteja, consulta o PostgreSQL.
   */
  async isBlacklisted(token: string): Promise<boolean> {
    if (!token) return false;
    const tokenHash = this.hashToken(token);
    const now = Date.now();

    const memExpiry = this.memoryBlacklist.get(tokenHash);
    if (memExpiry !== undefined) {
      if (now > memExpiry) {
        this.memoryBlacklist.delete(tokenHash);
        return false;
      }
      return true;
    }

    if (this.prisma) {
      try {
        const revoked = await this.prisma.revokedToken.findUnique({
          where: { tokenHash },
        });

        if (revoked) {
          if (revoked.expiresAt.getTime() > now) {
            this.memoryBlacklist.set(tokenHash, revoked.expiresAt.getTime());
            return true;
          } else {
            // Token já expirou no banco
            await this.prisma.revokedToken.delete({ where: { tokenHash } }).catch(() => {});
            return false;
          }
        }
      } catch (err) {
        // Fallback defensivo
      }
    }

    return false;
  }

  /**
   * Remove entradas expiradas para evitar consumo excessivo de memória e banco.
   */
  async cleanExpired(): Promise<void> {
    const now = Date.now();
    for (const [hash, expiresAt] of this.memoryBlacklist.entries()) {
      if (now > expiresAt) {
        this.memoryBlacklist.delete(hash);
      }
    }

    if (this.prisma) {
      try {
        await this.prisma.revokedToken.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
      } catch (err) {}
    }
  }

  /**
   * Limpa todos os registros (útil para suítes de testes).
   */
  clear(): void {
    this.memoryBlacklist.clear();
  }
}
