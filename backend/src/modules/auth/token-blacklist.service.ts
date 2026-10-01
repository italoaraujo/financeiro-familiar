import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenBlacklistService {
  private readonly blacklist = new Map<string, number>();

  /**
   * Adiciona um token à blacklist com prazo de expiração (TTL em milissegundos).
   * Padrão: 24 horas (tempo padrão de vida de um token na aplicação).
   */
  add(token: string, ttlMs: number = 24 * 60 * 60 * 1000): void {
    if (!token) return;
    this.cleanExpired();
    this.blacklist.set(token, Date.now() + ttlMs);
  }

  /**
   * Verifica se o token informado está na blacklist de tokens revogados.
   */
  isBlacklisted(token: string): boolean {
    if (!token) return false;
    const expiresAt = this.blacklist.get(token);
    if (!expiresAt) return false;

    if (Date.now() > expiresAt) {
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Remove entradas expiradas para evitar consumo excessivo de memória.
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [token, expiresAt] of this.blacklist.entries()) {
      if (now > expiresAt) {
        this.blacklist.delete(token);
      }
    }
  }

  /**
   * Limpa todos os registros (útil para suítes de testes).
   */
  clear(): void {
    this.blacklist.clear();
  }
}
