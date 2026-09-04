import { Test, TestingModule } from '@nestjs/testing';
import { GoalsModule } from '../../src/modules/goals/goals.module';
import { GoalsService } from '../../src/modules/goals/goals.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { GoalMovementType, GoalStatus, Prisma, TransactionType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('Goals Cofrinho Flow Integration Test', () => {
  let service: GoalsService;

  // Estado em memória das entidades para simular o banco com transações ACID
  let accounts: any[] = [];
  let goals: any[] = [];
  let goalDeposits: any[] = [];
  let transactions: any[] = [];
  let categories: any[] = [];

  beforeEach(async () => {
    accounts = [
      {
        id: 'acc-nubank-1',
        userId: 'user-teste',
        familyId: null,
        name: 'Conta Nubank',
        currentBalance: new Prisma.Decimal(5000.0),
        deletedAt: null,
      },
    ];
    goals = [];
    goalDeposits = [];
    transactions = [];
    categories = [];

    const mockPrismaService: any = {
      account: {
        findUnique: jest.fn(async ({ where }) => {
          return accounts.find((a) => a.id === where.id) || null;
        }),
        update: jest.fn(async ({ where, data }) => {
          const acc = accounts.find((a) => a.id === where.id);
          if (!acc) throw new Error('Account not found');
          if (data.currentBalance?.decrement) {
            acc.currentBalance = acc.currentBalance.minus(data.currentBalance.decrement);
          }
          if (data.currentBalance?.increment) {
            acc.currentBalance = acc.currentBalance.plus(data.currentBalance.increment);
          }
          return acc;
        }),
      },
      goal: {
        create: jest.fn(async ({ data }) => {
          const created = {
            id: `goal-${goals.length + 1}`,
            ...data,
            createdAt: new Date(),
            deletedAt: null,
          };
          goals.push(created);
          return created;
        }),
        findUnique: jest.fn(async ({ where }) => {
          return goals.find((g) => g.id === where.id) || null;
        }),
        findMany: jest.fn(async ({ where }) => {
          return goals.filter((g) => {
            if (where.deletedAt === null && g.deletedAt !== null) return false;
            if (where.userId && g.userId !== where.userId) return false;
            return true;
          });
        }),
        update: jest.fn(async ({ where, data }) => {
          const g = goals.find((item) => item.id === where.id);
          if (!g) throw new Error('Goal not found');
          Object.assign(g, data);
          return g;
        }),
      },
      goalDeposit: {
        create: jest.fn(async ({ data }) => {
          const created = {
            id: `dep-${goalDeposits.length + 1}`,
            ...data,
            createdAt: new Date(),
          };
          goalDeposits.push(created);
          return created;
        }),
      },
      transaction: {
        create: jest.fn(async ({ data }) => {
          const created = {
            id: `tx-${transactions.length + 1}`,
            ...data,
            createdAt: new Date(),
          };
          transactions.push(created);
          return created;
        }),
      },
      category: {
        findFirst: jest.fn(async ({ where }) => {
          return categories.find((c) => c.name === where.name) || null;
        }),
        create: jest.fn(async ({ data }) => {
          const cat = { id: `cat-${categories.length + 1}`, ...data };
          categories.push(cat);
          return cat;
        }),
      },
      familyMember: {
        findUnique: jest.fn(async () => null),
      },
      $transaction: jest.fn(async (callback) => callback(mockPrismaService)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, GoalsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    service = moduleFixture.get<GoalsService>(GoalsService);
  });

  it('deve executar o ciclo completo: vincular conta, aportar, bloquear exclusão, resgatar e excluir com saldo zerado', async () => {
    const userId = 'user-teste';

    // 1. Criar meta vinculada obrigatoriamente à conta Nubank
    const meta = await service.create(userId, {
      name: 'Reserva de Emergência',
      targetAmount: 3000.0,
      accountId: 'acc-nubank-1',
    });

    expect(meta.id).toBeDefined();
    expect(meta.accountId).toBe('acc-nubank-1');
    expect(meta.currentAmount.toString()).toBe('0');
    expect(meta.status).toBe(GoalStatus.IN_PROGRESS);

    // Saldo inicial da conta: R$ 5000
    expect(accounts[0].currentBalance.toNumber()).toBe(5000);

    // 2. Realizar Aporte de R$ 1000 na meta (debita da conta vinculada)
    const aporte = await service.addDeposit(userId, meta.id, {
      amount: 1000.0,
      depositDate: '2026-09-04',
      notes: 'Aporte inicial da reserva',
    });

    expect(aporte.id).toBeDefined();
    expect(aporte.type).toBe(GoalMovementType.DEPOSIT);
    expect(aporte.amount.toNumber()).toBe(1000.0);

    // Verifica reflexo nos saldos
    expect(meta.currentAmount.toNumber()).toBe(1000.0);
    expect(accounts[0].currentBalance.toNumber()).toBe(4000.0);

    // Verifica geração da transação contábil de transferência (aporte)
    expect(transactions).toHaveLength(1);
    expect(transactions[0].type).toBe(TransactionType.TRANSFER);
    expect(transactions[0].amount.toNumber()).toBe(1000.0);
    expect(transactions[0].accountId).toBe('acc-nubank-1');

    // 3. Tentar excluir a meta com saldo positivo -> DEVE SER BLOQUEADO!
    await expect(service.remove(userId, meta.id)).rejects.toThrow(BadRequestException);
    expect(goals[0].deletedAt).toBeNull();

    // 4. Realizar resgate parcial de R$ 400 da meta para a conta vinculada
    const resgateParcial = await service.withdraw(userId, meta.id, {
      amount: 400.0,
      withdrawalDate: '2026-09-04',
      notes: 'Resgate para pagar conta médica',
    });

    expect(resgateParcial.type).toBe(GoalMovementType.WITHDRAWAL);
    expect(resgateParcial.amount.toNumber()).toBe(400.0);

    // Verifica saldos pós resgate parcial:
    // Meta: 1000 - 400 = 600
    // Conta: 4000 + 400 = 4400
    expect(meta.currentAmount.toNumber()).toBe(600.0);
    expect(accounts[0].currentBalance.toNumber()).toBe(4400.0);

    // Verifica transação contábil de transferência (resgate)
    expect(transactions).toHaveLength(2);
    expect(transactions[1].type).toBe(TransactionType.TRANSFER);
    expect(transactions[1].amount.toNumber()).toBe(400.0);

    // Ainda não pode excluir porque tem R$ 600
    await expect(service.remove(userId, meta.id)).rejects.toThrow(BadRequestException);

    // 5. Realizar resgate total dos R$ 600 restantes
    await service.withdraw(userId, meta.id, {
      amount: 600.0,
      withdrawalDate: '2026-09-04',
      notes: 'Zerando saldo da meta',
    });

    expect(meta.currentAmount.toNumber()).toBe(0);
    expect(accounts[0].currentBalance.toNumber()).toBe(5000.0); // Saldo da conta restabelecido

    // 6. Agora com saldo exatamente zero, a exclusão DEVE SER PERMITIDA!
    const removeResult = await service.remove(userId, meta.id);
    expect(removeResult.message).toContain('removida com sucesso');
    expect(goals[0].deletedAt).not.toBeNull();
  });

  it('deve impedir resgate de valor superior ao saldo acumulado na meta', async () => {
    const userId = 'user-teste';

    const meta = await service.create(userId, {
      name: 'Viagem',
      targetAmount: 2000.0,
      accountId: 'acc-nubank-1',
    });

    await service.addDeposit(userId, meta.id, {
      amount: 300.0,
      depositDate: '2026-09-04',
    });

    // Tentativa de resgatar 500 tendo apenas 300
    await expect(
      service.withdraw(userId, meta.id, {
        amount: 500.0,
        withdrawalDate: '2026-09-04',
      }),
    ).rejects.toThrow(BadRequestException);

    // Saldo permanece inalterado
    expect(meta.currentAmount.toNumber()).toBe(300.0);
    expect(accounts[0].currentBalance.toNumber()).toBe(4700.0);
  });

  it('deve impedir aporte de valor superior ao saldo da conta bancária vinculada', async () => {
    const userId = 'user-teste';

    const meta = await service.create(userId, {
      name: 'Carro Novo',
      targetAmount: 20000.0,
      accountId: 'acc-nubank-1',
    });

    // Saldo atual da conta é 5000; tentativa de aportar 6000
    await expect(
      service.addDeposit(userId, meta.id, {
        amount: 6000.0,
        depositDate: '2026-09-04',
      }),
    ).rejects.toThrow(BadRequestException);

    // Saldo da meta e da conta inalterados
    expect(meta.currentAmount.toNumber()).toBe(0);
    expect(accounts[0].currentBalance.toNumber()).toBe(5000.0);
  });
});
