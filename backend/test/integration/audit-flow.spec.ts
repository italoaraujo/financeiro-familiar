import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { AuditLogsModule } from '../../src/modules/audit-logs/audit-logs.module';
import { AuditLogsService } from '../../src/modules/audit-logs/audit-logs.service';
import { AuditLogsController } from '../../src/modules/audit-logs/audit-logs.controller';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditAction, FamilyMemberRole } from '@prisma/client';
import { AuditLogInterceptor } from '../../src/common/interceptors/audit-log.interceptor';
import { of } from 'rxjs';

describe('Audit Flow Integration Test (e2e)', () => {
  let app: INestApplication;
  let auditLogsService: AuditLogsService;
  let prismaService: any;

  const mockDbLogs: any[] = [];

  beforeAll(async () => {
    prismaService = {
      auditLog: {
        create: jest.fn(async ({ data }) => {
          const created = { id: `log-${mockDbLogs.length + 1}`, ...data, createdAt: new Date() };
          mockDbLogs.push(created);
          return created;
        }),
        findMany: jest.fn(async ({ where }) => {
          return mockDbLogs.filter((log) => {
            if (where.familyId && log.familyId !== where.familyId) return false;
            if (where.userId && log.userId !== where.userId) return false;
            return true;
          });
        }),
        count: jest.fn(async () => mockDbLogs.length),
        findUnique: jest.fn(async ({ where }) => {
          return mockDbLogs.find((log) => log.id === where.id) || null;
        }),
      },
      familyMember: {
        findUnique: jest.fn(async ({ where }) => {
          if (where.familyId_userId.userId === 'admin-user') {
            return { role: FamilyMemberRole.ADMIN };
          }
          if (where.familyId_userId.userId === 'owner-user') {
            return { role: FamilyMemberRole.OWNER };
          }
          if (where.familyId_userId.userId === 'normal-user') {
            return { role: FamilyMemberRole.MEMBER };
          }
          return null;
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuditLogsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    auditLogsService = moduleFixture.get<AuditLogsService>(AuditLogsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockDbLogs.length = 0;
    jest.clearAllMocks();
  });

  it('deve registrar automaticamente a ação mutativa com payload sanitizado através do interceptor', async () => {
    const interceptor = new AuditLogInterceptor(auditLogsService);

    const reqContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/transactions',
          ip: '192.168.0.10',
          headers: { 'user-agent': 'Chrome/120' },
          user: { id: 'admin-user' },
          body: {
            description: 'Compra com Cartão',
            amount: 250.0,
            password: 'secretpassword123',
            token: 'jwt-auth-token',
            familyId: 'family-1',
          },
        }),
        getResponse: () => ({
          statusCode: 201,
        }),
      }),
    } as any;

    const next = {
      handle: () => of({ success: true }),
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(reqContext, next).subscribe({
        next: () => {
          setTimeout(resolve, 50);
        },
      });
    });

    expect(prismaService.auditLog.create).toHaveBeenCalledTimes(1);
    expect(mockDbLogs).toHaveLength(1);

    const logged = mockDbLogs[0];
    expect(logged.action).toBe(AuditAction.CREATE);
    expect(logged.method).toBe('POST');
    expect(logged.endpoint).toBe('/transactions');
    expect(logged.userId).toBe('admin-user');
    expect(logged.familyId).toBe('family-1');
    expect(logged.statusCode).toBe(201);
    expect(logged.durationMs).toBeGreaterThanOrEqual(0);

    // Verificação estrita de segurança e sanitização (LOGS-03)
    expect(logged.newData.description).toBe('Compra com Cartão');
    expect(logged.newData.amount).toBe(250.0);
    expect(logged.newData.password).toBe('[REDACTED]');
    expect(logged.newData.token).toBe('[REDACTED]');
  });

  it('deve permitir consulta paginada de logs para usuário ADMIN da família', async () => {
    // Insere 2 logs na base mock
    await auditLogsService.createLog({
      userId: 'admin-user',
      familyId: 'family-1',
      action: AuditAction.CREATE,
      method: 'POST',
      endpoint: '/accounts',
      statusCode: 201,
      durationMs: 15,
      newData: { name: 'Conta Nubank' },
    });

    await auditLogsService.createLog({
      userId: 'other-user',
      familyId: 'family-1',
      action: AuditAction.DELETE,
      method: 'DELETE',
      endpoint: '/accounts/123',
      statusCode: 200,
      durationMs: 22,
      newData: {},
    });

    const controller = app.get(AuditLogsController);
    const result = await controller.findAll('admin-user', { familyId: 'family-1' });

    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(result.meta.page).toBe(1);
  });

  it('deve bloquear consulta de logs de família para membros sem perfil ADMIN/OWNER', async () => {
    const controller = app.get(AuditLogsController);

    await expect(
      controller.findAll('normal-user', { familyId: 'family-1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deve consultar log específico por ID garantindo autorização', async () => {
    await auditLogsService.createLog({
      userId: 'admin-user',
      familyId: 'family-1',
      action: AuditAction.UPDATE,
      method: 'PUT',
      endpoint: '/categories/cat-1',
      statusCode: 200,
      newData: { name: 'Alimentação' },
    });

    const createdId = mockDbLogs[0].id;
    const controller = app.get(AuditLogsController);

    const logDetails = await controller.findById('admin-user', createdId);
    expect(logDetails).toBeDefined();
    expect(logDetails.id).toBe(createdId);
    expect(logDetails.action).toBe(AuditAction.UPDATE);
  });
});
