import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from '../../src/modules/tags/tags.service';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { CreditCardsService } from '../../src/modules/credit-cards/credit-cards.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Prisma, TransactionType, FamilyMemberRole } from '@prisma/client';

describe('Tags Flow Integration Test (End-to-End)', () => {
  let tagsService: TagsService;
  let transactionsService: TransactionsService;
  let reportsService: ReportsService;

  // Estado em memória
  let tags: any[] = [];
  let transactionTags: any[] = [];
  let transactions: any[] = [];
  let accounts: any[] = [];
  let creditCards: any[] = [];
  let invoices: any[] = [];
  let categories: any[] = [];
  let familyMembers: any[] = [];

  const mockPrismaService: any = {
    $transaction: jest.fn(async (callback) => callback(mockPrismaService)),

    tag: {
      findFirst: jest.fn(async ({ where }) => {
        return (
          tags.find((t) => {
            if (where.familyId !== undefined && t.familyId !== where.familyId) return false;
            if (where.userId !== undefined && t.userId !== where.userId) return false;
            if (where.name?.equals && t.name.toLowerCase() !== where.name.equals.toLowerCase()) return false;
            if (typeof where.name === 'string' && t.name.toLowerCase() !== where.name.toLowerCase()) return false;
            return true;
          }) || null
        );
      }),
      findMany: jest.fn(async ({ where }) => {
        return tags.filter((t) => {
          if (where.familyId !== undefined && t.familyId !== where.familyId) return false;
          if (where.userId !== undefined && t.userId !== where.userId) return false;
          if (where.name?.in && !where.name.in.includes(t.name)) return false;
          return true;
        });
      }),
      create: jest.fn(async ({ data }) => {
        const newTag = {
          id: `tag-${tags.length + 1}`,
          ...data,
          createdAt: new Date(),
        };
        tags.push(newTag);
        return newTag;
      }),
    },

    transactionTag: {
      create: jest.fn(async ({ data }) => {
        const item = {
          id: `tt-${transactionTags.length + 1}`,
          ...data,
          createdAt: new Date(),
        };
        transactionTags.push(item);
        return item;
      }),
      findMany: jest.fn(async ({ where }) => {
        return transactionTags.filter((tt) => {
          if (where.tagId && tt.tagId !== where.tagId) return false;
          if (where.transactionId && tt.transactionId !== where.transactionId) return false;
          return true;
        });
      }),
      createMany: jest.fn(async ({ data }) => {
        data.forEach((item: any) => {
          transactionTags.push({
            id: `tt-${transactionTags.length + 1}`,
            ...item,
            createdAt: new Date(),
          });
        });
        return { count: data.length };
      }),
      deleteMany: jest.fn(async ({ where }) => {
        const initialLen = transactionTags.length;
        transactionTags = transactionTags.filter((tt) => {
          if (where.transactionId && tt.transactionId === where.transactionId) return false;
          return true;
        });
        return { count: initialLen - transactionTags.length };
      }),
    },

    transaction: {
      create: jest.fn(async ({ data }) => {
        const created = {
          id: `tx-${transactions.length + 1}`,
          ...data,
          amount: new Prisma.Decimal(data.amount),
          status: 'COMPLETED',
          createdAt: new Date(),
          deletedAt: null,
        };
        transactions.push(created);
        return created;
      }),
      findMany: jest.fn(async (query: any) => {
        const { where } = query;
        let list = transactions.filter((tx) => {
          if (where.deletedAt === null && tx.deletedAt !== null) return false;
          if (where.familyId !== undefined && tx.familyId !== where.familyId) return false;
          if (where.userId !== undefined && tx.userId !== where.userId) return false;
          if (where.type && tx.type !== where.type) return false;
          if (where.tags?.some) {
            const some = where.tags.some;
            let targetTagId = some.tagId;
            let targetTagName = some.tag?.name?.equals;
            if (some.OR) {
              targetTagId = some.OR.find((o: any) => o.tagId)?.tagId;
              targetTagName = some.OR.find((o: any) => o.tag?.name?.equals)?.tag?.name?.equals;
            }
            if (targetTagId || targetTagName) {
              const hasTag = transactionTags.some((tt) => {
                if (tt.transactionId !== tx.id) return false;
                if (targetTagId && tt.tagId === targetTagId) return true;
                if (targetTagName) {
                  const t = tags.find((tag) => tag.id === tt.tagId);
                  if (t && t.name.toLowerCase() === targetTagName.toLowerCase()) return true;
                }
                return false;
              });
              if (!hasTag) return false;
            }
          }
          if (where.transactionDate?.gte && tx.transactionDate < where.transactionDate.gte) return false;
          if (where.transactionDate?.lte && tx.transactionDate > where.transactionDate.lte) return false;
          return true;
        });

        // Enriquecimento com tags e categoria para listagem
        return list.map((tx) => {
          const matchedTTs = transactionTags.filter((tt) => tt.transactionId === tx.id);
          const txTags = matchedTTs.map((tt) => ({
            tag: tags.find((t) => t.id === tt.tagId),
          }));
          const cat = categories.find((c) => c.id === tx.categoryId);
          const acc = accounts.find((a) => a.id === tx.accountId);
          const card = creditCards.find((c) => c.id === tx.creditCardId);
          return {
            ...tx,
            tags: txTags,
            category: cat || null,
            account: acc || null,
            creditCard: card || null,
            person: null,
            user: { id: tx.userId, name: 'Usuário Teste', email: 'teste@example.com' },
          };
        });
      }),
      count: jest.fn(async ({ where }) => {
        return transactions.filter((tx) => {
          if (where.deletedAt === null && tx.deletedAt !== null) return false;
          if (where.familyId !== undefined && tx.familyId !== where.familyId) return false;
          if (where.tags?.some) {
            const some = where.tags.some;
            let targetTagId = some.tagId;
            let targetTagName = some.tag?.name?.equals;
            if (some.OR) {
              targetTagId = some.OR.find((o: any) => o.tagId)?.tagId;
              targetTagName = some.OR.find((o: any) => o.tag?.name?.equals)?.tag?.name?.equals;
            }
            if (targetTagId || targetTagName) {
              const hasTag = transactionTags.some((tt) => {
                if (tt.transactionId !== tx.id) return false;
                if (targetTagId && tt.tagId === targetTagId) return true;
                if (targetTagName) {
                  const t = tags.find((tag) => tag.id === tt.tagId);
                  if (t && t.name.toLowerCase() === targetTagName.toLowerCase()) return true;
                }
                return false;
              });
              if (!hasTag) return false;
            }
          }
          return true;
        }).length;
      }),
      aggregate: jest.fn(async ({ where }) => {
        let list = transactions.filter((tx) => {
          if (where.deletedAt === null && tx.deletedAt !== null) return false;
          if (where.familyId !== undefined && tx.familyId !== where.familyId) return false;
          if (where.type && tx.type !== where.type) return false;
          if (where.tags?.some?.tagId) {
            const hasTag = transactionTags.some(
              (tt) => tt.transactionId === tx.id && tt.tagId === where.tags.some.tagId,
            );
            if (!hasTag) return false;
          }
          if (where.transactionDate?.gte && tx.transactionDate < where.transactionDate.gte) return false;
          if (where.transactionDate?.lte && tx.transactionDate > where.transactionDate.lte) return false;
          return true;
        });
        const sum = list.reduce((acc, item) => acc.add(item.amount), new Prisma.Decimal(0));
        return {
          _sum: {
            amount: sum,
          },
        };
      }),
    },

    account: {
      findUnique: jest.fn(async ({ where }) => accounts.find((a) => a.id === where.id) || null),
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

    creditCard: {
      findUnique: jest.fn(async ({ where }) => creditCards.find((c) => c.id === where.id) || null),
      update: jest.fn(async ({ where, data }) => {
        const card = creditCards.find((c) => c.id === where.id);
        if (!card) throw new Error('Credit card not found');
        if (data.availableLimit?.decrement) {
          card.availableLimit = card.availableLimit.minus(data.availableLimit.decrement);
        }
        return card;
      }),
    },

    creditCardInvoice: {
      findFirst: jest.fn(async () => invoices[0] || null),
      create: jest.fn(async ({ data }) => {
        const inv = { id: `inv-${invoices.length + 1}`, ...data, totalAmount: new Prisma.Decimal(0) };
        invoices.push(inv);
        return inv;
      }),
      update: jest.fn(async ({ where, data }) => {
        const inv = invoices.find((i) => i.id === where.id);
        if (inv && data.totalAmount?.increment) {
          inv.totalAmount = inv.totalAmount.plus(data.totalAmount.increment);
        }
        return inv;
      }),
    },

    familyMember: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.familyId_userId) {
          const { familyId, userId } = where.familyId_userId;
          return familyMembers.find(
            (m) => m.familyId === familyId && m.userId === userId,
          ) || null;
        }
        return null;
      }),
      findFirst: jest.fn(async ({ where }) => {
        return familyMembers.find(
          (m) => m.familyId === where.familyId && m.userId === where.userId,
        ) || null;
      }),
    },
  };

  beforeEach(async () => {
    tags = [];
    transactionTags = [];
    transactions = [];
    invoices = [
      {
        id: 'inv-1',
        creditCardId: 'card-1',
        month: 9,
        year: 2026,
        status: 'OPEN',
        totalAmount: new Prisma.Decimal(0),
      },
    ];
    accounts = [
      {
        id: 'acc-1',
        userId: 'user-1',
        familyId: 'family-1',
        name: 'Conta Corrente',
        currentBalance: new Prisma.Decimal('3000.00'),
        deletedAt: null,
      },
    ];
    creditCards = [
      {
        id: 'card-1',
        userId: 'user-1',
        familyId: 'family-1',
        name: 'Cartão Black',
        creditLimit: new Prisma.Decimal('10000.00'),
        limit: new Prisma.Decimal('10000.00'),
        availableLimit: new Prisma.Decimal('10000.00'),
        closingDay: 20,
        dueDay: 28,
        isActive: true,
        invoices: [],
        deletedAt: null,
      },
    ];
    categories = [
      { id: 'cat-alimentacao', name: 'Alimentação', color: '#10b981' },
      { id: 'cat-viagem', name: 'Viagem', color: '#3b82f6' },
    ];
    familyMembers = [
      { id: 'fm-1', familyId: 'family-1', userId: 'user-1', role: FamilyMemberRole.ADMIN },
    ];

    const mockCreditCardsService = {
      determineInvoiceForDate: jest.fn(async (cardId: string) => ({
        id: 'inv-1',
        creditCardId: cardId,
        status: 'OPEN',
        totalAmount: new Prisma.Decimal(0),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        TransactionsService,
        ReportsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CreditCardsService, useValue: mockCreditCardsService },
      ],
    }).compile();

    tagsService = module.get<TagsService>(TagsService);
    transactionsService = module.get<TransactionsService>(TransactionsService);
    reportsService = module.get<ReportsService>(ReportsService);
  });

  it('should create tags, link them to a single transaction, and retrieve with sanitized tag list', async () => {
    // 1. Criar transação de despesa com 2 tags
    const result = await transactionsService.create('user-1', {
      type: TransactionType.EXPENSE,
      amount: 150.0,
      description: 'Jantar em Família',
      transactionDate: '2026-09-10',
      categoryId: 'cat-alimentacao',
      accountId: 'acc-1',
      familyId: 'family-1',
      tags: ['restaurante', 'fim-de-semana'],
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('tx-1');

    // 2. Validar que as tags foram cadastradas
    expect(tags).toHaveLength(2);
    expect(tags.map((t) => t.name)).toEqual(['restaurante', 'fim-de-semana']);

    // 3. Validar associações na tabela TransactionTag
    expect(transactionTags).toHaveLength(2);
    expect(transactionTags.map((tt) => tt.transactionId)).toEqual(['tx-1', 'tx-1']);

    // 4. Buscar lançamentos filtrando pela tag 'restaurante'
    const tagRestaurante = tags.find((t) => t.name === 'restaurante');
    const filteredList = await transactionsService.findAll('user-1', {
      familyId: 'family-1',
      tagId: tagRestaurante.id,
    });

    expect(filteredList.data).toHaveLength(1);
    expect(filteredList.data[0].id).toBe('tx-1');
    expect(filteredList.data[0].tags).toHaveLength(2);
  });

  it('should propagate tags to ALL installments when creating a credit card purchase with installments', async () => {
    // 1. Criar compra parcelada no cartão em 3x com a tag 'ferias'
    const result = await transactionsService.create('user-1', {
      type: TransactionType.EXPENSE,
      amount: 300.0,
      description: 'Passagens Aéreas',
      transactionDate: '2026-09-15',
      categoryId: 'cat-viagem',
      creditCardId: 'card-1',
      totalInstallments: 3,
      familyId: 'family-1',
      tags: ['ferias'],
    });

    expect(result).toBeDefined();
    // 3 parcelas criadas na tabela de transações
    expect(transactions).toHaveLength(3);

    const tagFerias = tags.find((t) => t.name === 'ferias');
    expect(tagFerias).toBeDefined();

    // 2. Verificar que cada uma das 3 parcelas possui o vínculo em TransactionTag
    const linkedTxIds = transactionTags.map((tt) => tt.transactionId);
    expect(linkedTxIds).toHaveLength(3);
    expect(linkedTxIds).toContain('tx-1');
    expect(linkedTxIds).toContain('tx-2');
    expect(linkedTxIds).toContain('tx-3');

    // Todas as parcelas pertencem ao mesmo installmentGroupId
    const groupIds = transactions.map((tx) => tx.installmentGroupId);
    expect(groupIds[0]).toBeDefined();
    expect(groupIds[0]).toBe(groupIds[1]);
    expect(groupIds[1]).toBe(groupIds[2]);
  });

  it('should isolate transactions correctly when filtering by tagId', async () => {
    // 1. Lançamento 1: com tag 'supermercado'
    await transactionsService.create('user-1', {
      type: TransactionType.EXPENSE,
      amount: 80.0,
      description: 'Compras Semanais',
      transactionDate: '2026-09-12',
      categoryId: 'cat-alimentacao',
      accountId: 'acc-1',
      familyId: 'family-1',
      tags: ['supermercado'],
    });

    // 2. Lançamento 2: com tag 'lazer'
    await transactionsService.create('user-1', {
      type: TransactionType.EXPENSE,
      amount: 50.0,
      description: 'Cinema',
      transactionDate: '2026-09-13',
      categoryId: 'cat-viagem',
      accountId: 'acc-1',
      familyId: 'family-1',
      tags: ['lazer'],
    });

    const tagSuper = tags.find((t) => t.name === 'supermercado');
    const tagLazer = tags.find((t) => t.name === 'lazer');

    // 3. Filtrar por 'supermercado'
    const resultSuper = await transactionsService.findAll('user-1', {
      familyId: 'family-1',
      tagId: tagSuper.id,
    });
    expect(resultSuper.data).toHaveLength(1);
    expect(resultSuper.data[0].description).toBe('Compras Semanais');

    // 4. Filtrar por 'lazer'
    const resultLazer = await transactionsService.findAll('user-1', {
      familyId: 'family-1',
      tagId: tagLazer.id,
    });
    expect(resultLazer.data).toHaveLength(1);
    expect(resultLazer.data[0].description).toBe('Cinema');
  });

  it('should calculate Cash Flow and Expenses by Tag reports correctly with tag filter and CSV export', async () => {
    // 1. Criar transações com tags distintas
    // Despesa A: R$ 200,00 com tag 'viagem'
    await transactionsService.create('user-1', {
      type: TransactionType.EXPENSE,
      amount: 200.0,
      description: 'Hotel',
      transactionDate: '2026-09-05',
      categoryId: 'cat-viagem',
      accountId: 'acc-1',
      familyId: 'family-1',
      tags: ['viagem'],
    });

    // Despesa B: R$ 100,00 com tag 'viagem'
    await transactionsService.create('user-1', {
      type: TransactionType.EXPENSE,
      amount: 100.0,
      description: 'Combustivel',
      transactionDate: '2026-09-08',
      categoryId: 'cat-viagem',
      accountId: 'acc-1',
      familyId: 'family-1',
      tags: ['viagem'],
    });

    // Despesa C: R$ 100,00 com tag 'casa'
    await transactionsService.create('user-1', {
      type: TransactionType.EXPENSE,
      amount: 100.0,
      description: 'Mercado Casa',
      transactionDate: '2026-09-09',
      categoryId: 'cat-alimentacao',
      accountId: 'acc-1',
      familyId: 'family-1',
      tags: ['casa'],
    });

    const tagViagem = tags.find((t) => t.name === 'viagem');

    // 2. Relatório de Despesas por Tag (getExpensesByTag)
    const expensesByTag = await reportsService.getExpensesByTag('user-1', 'family-1');
    expect(expensesByTag).toHaveLength(2);

    const tagViagemReport = expensesByTag.find((t: any) => t.name === 'viagem');
    const tagCasaReport = expensesByTag.find((t: any) => t.name === 'casa');

    // Total de despesas com tag: 300 (viagem) + 100 (casa) = 400
    // Viagem: 300 / 400 = 75%
    // Casa: 100 / 400 = 25%
    expect(Number(tagViagemReport.amount)).toBe(300);
    expect(tagViagemReport.count).toBe(2);
    expect(tagViagemReport.percentage).toBe(75);

    expect(Number(tagCasaReport.amount)).toBe(100);
    expect(tagCasaReport.count).toBe(1);
    expect(tagCasaReport.percentage).toBe(25);

    // 3. Relatório de Fluxo de Caixa filtrado por tag 'viagem'
    const cashFlow = await reportsService.getCashFlow('user-1', 'family-1', 6, tagViagem.id);
    expect(cashFlow).toBeDefined();
    // No mês de setembro/2026, as despesas devem somar exatamente 300.00
    const currentMonthData = cashFlow.find((m: any) => m.month.includes('09/2026') || m.month.includes('Sep'));
    if (currentMonthData) {
      expect(currentMonthData.expense).toBe(300);
    }

    // 4. Exportação CSV com coluna Tags
    const csv = await reportsService.exportCsv('user-1', 'family-1', undefined, undefined, tagViagem.id);
    expect(csv).toContain('"Tags"');
    expect(csv).toContain('Hotel');
    expect(csv).toContain('Combustivel');
    expect(csv).toContain('viagem');
    expect(csv).not.toContain('Mercado Casa');
  });
});
