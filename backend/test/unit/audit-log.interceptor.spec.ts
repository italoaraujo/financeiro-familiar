import { ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditLogInterceptor } from '../../src/common/interceptors/audit-log.interceptor';
import { AuditLogsService } from '../../src/modules/audit-logs/audit-logs.service';
import { AuditAction } from '@prisma/client';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let auditLogsService: any;

  beforeEach(() => {
    auditLogsService = {
      createLog: jest.fn().mockResolvedValue(undefined),
    };
    interceptor = new AuditLogInterceptor(auditLogsService);
  });

  function createMockContext(method: string, url: string, body: any = {}, user: any = null, query: any = {}, params: any = {}) {
    const request = {
      method,
      url,
      originalUrl: url,
      body,
      query,
      params,
      user,
      ip: '192.168.1.100',
      headers: { 'user-agent': 'JestTestRunner' },
    };

    const response = {
      statusCode: 200,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  }

  it('deve ignorar requisições GET sem acionar o serviço de auditoria', (done) => {
    const context = createMockContext('GET', '/transactions');
    const next: CallHandler = {
      handle: () => of({ data: [] }),
    };

    interceptor.intercept(context, next).subscribe({
      next: (result) => {
        expect(result).toEqual({ data: [] });
        expect(auditLogsService.createLog).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('deve interceptar requisição POST, sanitizar o body e registrar log com CREATE', (done) => {
    const user = { id: 'user-123' };
    const body = {
      description: 'Compra Mercado',
      amount: 150.0,
      password: 'minhasenhasecreta',
      familyId: 'family-456',
    };
    const context = createMockContext('POST', '/transactions', body, user);
    (context.switchToHttp().getResponse() as any).statusCode = 201;

    const next: CallHandler = {
      handle: () => of({ id: 'tx-1', description: 'Compra Mercado' }),
    };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(auditLogsService.createLog).toHaveBeenCalledTimes(1);
        expect(auditLogsService.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123',
            familyId: 'family-456',
            action: AuditAction.CREATE,
            method: 'POST',
            endpoint: '/transactions',
            ipAddress: '192.168.1.100',
            userAgent: 'JestTestRunner',
            statusCode: 201,
            durationMs: expect.any(Number),
            newData: expect.objectContaining({
              description: 'Compra Mercado',
              password: '[REDACTED]',
            }),
          }),
        );
        done();
      },
    });
  });

  it('deve interceptar requisição DELETE e registrar log com DELETE', (done) => {
    const user = { id: 'user-123' };
    const context = createMockContext('DELETE', '/accounts/acc-789', {}, user);
    (context.switchToHttp().getResponse() as any).statusCode = 200;

    const next: CallHandler = {
      handle: () => of({ message: 'Conta excluída' }),
    };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(auditLogsService.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123',
            action: AuditAction.DELETE,
            method: 'DELETE',
            endpoint: '/accounts/acc-789',
            statusCode: 200,
          }),
        );
        done();
      },
    });
  });

  it('deve interceptar PUT/PATCH e registrar log com UPDATE', (done) => {
    const user = { id: 'user-123' };
    const body = { name: 'Conta Salário Atualizada' };
    const context = createMockContext('PUT', '/accounts/acc-1', body, user);

    const next: CallHandler = {
      handle: () => of({ id: 'acc-1', name: 'Conta Salário Atualizada' }),
    };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(auditLogsService.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.UPDATE,
            method: 'PUT',
            newData: { name: 'Conta Salário Atualizada' },
          }),
        );
        done();
      },
    });
  });

  it('deve registrar log com status de erro quando a requisição lançar exceção', (done) => {
    const user = { id: 'user-123' };
    const body = { amount: -10 };
    const context = createMockContext('POST', '/transactions', body, user);
    const error = new HttpException('Valor inválido', HttpStatus.BAD_REQUEST);

    const next: CallHandler = {
      handle: () => throwError(() => error),
    };

    interceptor.intercept(context, next).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        expect(auditLogsService.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            statusCode: 400,
            newData: { amount: -10 },
          }),
        );
        done();
      },
    });
  });

  it('deve extrair o primeiro IP de múltiplos proxies e truncar se exceder 45 caracteres', (done) => {
    const rawContext = createMockContext('POST', '/transactions', { desc: 'test' });
    const req = rawContext.switchToHttp().getRequest() as any;
    req.ip = undefined;
    req.headers['x-forwarded-for'] = '203.0.113.195, 70.41.3.18, 150.172.238.178';

    const next: CallHandler = {
      handle: () => of({ success: true }),
    };

    interceptor.intercept(rawContext, next).subscribe({
      next: () => {
        expect(auditLogsService.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            ipAddress: '203.0.113.195',
          }),
        );
        done();
      },
    });
  });

  it('deve truncar endereço de IP em no máximo 45 caracteres para evitar erro de banco', (done) => {
    const rawContext = createMockContext('POST', '/transactions', { desc: 'test' });
    const req = rawContext.switchToHttp().getRequest() as any;
    req.ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334:excessively_long_suffix_exceeding_forty_five_chars';

    const next: CallHandler = {
      handle: () => of({ success: true }),
    };

    interceptor.intercept(rawContext, next).subscribe({
      next: () => {
        expect(auditLogsService.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            ipAddress: req.ip.slice(0, 45),
          }),
        );
        done();
      },
    });
  });
});
