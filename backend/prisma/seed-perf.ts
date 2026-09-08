import {
  PrismaClient,
  Prisma,
  TransactionType,
  AccountType,
  InvoiceStatus,
  GoalStatus,
  GoalMovementType,
  TransactionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface SeedPerfStats {
  users: number;
  families: number;
  accounts: number;
  creditCards: number;
  people: number;
  invoices: number;
  categories: number;
  goals: number;
  goalDeposits: number;
  budgets: number;
  transactions: number;
  durationMs: number;
}

export async function cleanupPerfUser() {
  const existingUser = await prisma.user.findUnique({
    where: { email: 'perf@exemplo.com' },
    include: {
      ownedFamilies: true,
    },
  });

  if (existingUser) {
    console.log('🧹 Limpando dados anteriores do usuário de benchmark (perf@exemplo.com)...');

    // Removendo dependências em ordem reversa para garantir integridade referencial
    await prisma.goalDeposit.deleteMany({
      where: { goal: { userId: existingUser.id } },
    });
    await prisma.goal.deleteMany({
      where: { userId: existingUser.id },
    });
    await prisma.budget.deleteMany({
      where: { userId: existingUser.id },
    });
    await prisma.transaction.deleteMany({
      where: { userId: existingUser.id },
    });
    await prisma.creditCardInvoice.deleteMany({
      where: { creditCard: { userId: existingUser.id } },
    });
    await prisma.creditCard.deleteMany({
      where: { userId: existingUser.id },
    });
    await prisma.account.deleteMany({
      where: { userId: existingUser.id },
    });
    await prisma.person.deleteMany({
      where: { family: { ownerId: existingUser.id } },
    });
    await prisma.familyMember.deleteMany({
      where: { userId: existingUser.id },
    });
    await prisma.family.deleteMany({
      where: { ownerId: existingUser.id },
    });
    await prisma.user.delete({
      where: { id: existingUser.id },
    });
    console.log('✅ Dados de teste anteriores limpos com sucesso.');
  }
}

export async function createBaseEntities() {
  console.log('👤 Criando usuário e família de performance...');
  const passwordHash = await bcrypt.hash('123456', 10);

  const perfUser = await prisma.user.create({
    data: {
      name: 'Usuário Benchmark',
      email: 'perf@exemplo.com',
      passwordHash,
    },
  });

  const perfFamily = await prisma.family.create({
    data: {
      name: 'Família Performance',
      description: 'Família para testes de carga e benchmarks de desempenho',
      ownerId: perfUser.id,
    },
  });

  await prisma.familyMember.create({
    data: {
      familyId: perfFamily.id,
      userId: perfUser.id,
      role: 'OWNER',
    },
  });

  console.log('👥 Criando pessoas da família...');
  const peopleData = [
    { name: 'Carlos Silva (Titular)', color: '#3b82f6', userId: perfUser.id },
    { name: 'Mariana Silva (Cônjuge)', color: '#ec4899' },
    { name: 'Lucas Silva (Filho)', color: '#10b981' },
    { name: 'Beatriz Silva (Filha)', color: '#f59e0b' },
  ];

  const people = [];
  for (const p of peopleData) {
    const person = await prisma.person.create({
      data: {
        familyId: perfFamily.id,
        userId: p.userId,
        name: p.name,
        color: p.color,
      },
    });
    people.push(person);
  }

  console.log('🏦 Criando contas bancárias...');
  const accountsData = [
    {
      name: 'Conta Corrente Banco Principal',
      type: AccountType.CHECKING,
      initialBalance: 25000.0,
      currentBalance: 25000.0,
      color: '#3b82f6',
      icon: 'Landmark',
    },
    {
      name: 'Conta Investimentos & Reserva',
      type: AccountType.INVESTMENT,
      initialBalance: 80000.0,
      currentBalance: 80000.0,
      color: '#10b981',
      icon: 'TrendingUp',
    },
    {
      name: 'Carteira Dinheiro Vivo',
      type: AccountType.CASH,
      initialBalance: 1200.0,
      currentBalance: 1200.0,
      color: '#f59e0b',
      icon: 'Wallet',
    },
  ];

  const accounts = [];
  for (const acc of accountsData) {
    const account = await prisma.account.create({
      data: {
        userId: perfUser.id,
        familyId: perfFamily.id,
        name: acc.name,
        type: acc.type,
        initialBalance: acc.initialBalance,
        currentBalance: acc.currentBalance,
        currency: 'BRL',
        color: acc.color,
        icon: acc.icon,
      },
    });
    accounts.push(account);
  }

  console.log('💳 Criando cartões de crédito e faturas...');
  const cardBlack = await prisma.creditCard.create({
    data: {
      userId: perfUser.id,
      familyId: perfFamily.id,
      accountId: accounts[0].id,
      name: 'Cartão Black Prime',
      brand: 'Mastercard',
      creditLimit: 35000.0,
      closingDay: 25,
      dueDay: 5,
      color: '#0f172a',
    },
  });

  const cardPlatinum = await prisma.creditCard.create({
    data: {
      userId: perfUser.id,
      familyId: perfFamily.id,
      accountId: accounts[0].id,
      name: 'Cartão Platinum Rewards',
      brand: 'Visa',
      creditLimit: 18000.0,
      closingDay: 10,
      dueDay: 20,
      color: '#6366f1',
    },
  });

  const cards = [cardBlack, cardPlatinum];
  const invoices = [];

  // Gerar faturas dos últimos 24 meses
  const now = new Date();
  for (const card of cards) {
    for (let m = 23; m >= 0; m--) {
      const refDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const year = refDate.getFullYear();
      const month = String(refDate.getMonth() + 1).padStart(2, '0');
      const referenceMonth = `${year}-${month}`;

      const closingDate = new Date(year, refDate.getMonth(), card.closingDay);
      const dueMonth = card.dueDay < card.closingDay ? refDate.getMonth() + 1 : refDate.getMonth();
      const dueDate = new Date(year, dueMonth, card.dueDay);

      const isCurrentMonth = m === 0;
      const status = isCurrentMonth ? InvoiceStatus.OPEN : InvoiceStatus.PAID;

      const invoice = await prisma.creditCardInvoice.create({
        data: {
          creditCardId: card.id,
          referenceMonth,
          closingDate,
          dueDate,
          status,
          totalAmount: 0.0,
          paidAmount: 0.0,
          paidAt: status === InvoiceStatus.PAID ? dueDate : null,
        },
      });
      invoices.push(invoice);
    }
  }

  // Obter categorias ativas disponíveis
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { isSystemDefault: true },
        { familyId: perfFamily.id },
      ],
      deletedAt: null,
    },
  });

  return {
    perfUser,
    perfFamily,
    people,
    accounts,
    cards,
    invoices,
    categories,
  };
}

export async function createGoalsAndBudgets(
  user: { id: string },
  family: { id: string },
  accounts: { id: string }[],
  categories: { id: string; type: TransactionType; name: string }[],
) {
  console.log('🎯 Criando metas (goals) e orçamentos (budgets)...');

  const goalsData = [
    {
      name: 'Reserva de Emergência 100k',
      targetAmount: 100000.0,
      currentAmount: 65000.0,
      deadline: new Date(new Date().getFullYear() + 1, 11, 31),
      status: GoalStatus.IN_PROGRESS,
      color: '#10b981',
      icon: 'ShieldCheck',
    },
    {
      name: 'Viagem de Férias em Família',
      targetAmount: 25000.0,
      currentAmount: 18500.0,
      deadline: new Date(new Date().getFullYear(), 11, 20),
      status: GoalStatus.IN_PROGRESS,
      color: '#3b82f6',
      icon: 'Plane',
    },
    {
      name: 'Troca de Carro',
      targetAmount: 60000.0,
      currentAmount: 22000.0,
      deadline: new Date(new Date().getFullYear() + 2, 5, 30),
      status: GoalStatus.IN_PROGRESS,
      color: '#8b5cf6',
      icon: 'Car',
    },
  ];

  const createdGoals = [];
  let totalDeposits = 0;

  for (const g of goalsData) {
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        familyId: family.id,
        accountId: accounts[1].id, // Conta Investimentos
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        deadline: g.deadline,
        status: g.status,
        color: g.color,
        icon: g.icon,
      },
    });
    createdGoals.push(goal);

    // Gerar 6 depósitos históricos para cada meta
    for (let i = 5; i >= 0; i--) {
      const depositDate = new Date();
      depositDate.setMonth(depositDate.getMonth() - i);
      const depositAmount = Number((g.currentAmount / 6).toFixed(2));

      await prisma.goalDeposit.create({
        data: {
          goalId: goal.id,
          type: GoalMovementType.DEPOSIT,
          amount: depositAmount,
          depositDate,
          notes: `Aporte mensal planejado #${6 - i}`,
        },
      });
      totalDeposits++;
    }
  }

  // Orçamentos para os últimos 12 meses em categorias chave
  const expenseCategories = categories.filter((c) => c.type === TransactionType.EXPENSE);
  const targetCategories = expenseCategories.slice(0, 5);
  let totalBudgets = 0;

  const now = new Date();
  for (let m = 11; m >= 0; m--) {
    const refDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const periodMonth = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;

    for (const cat of targetCategories) {
      let targetAmount = 1500;
      if (cat.name === 'Alimentação') targetAmount = 3500;
      if (cat.name === 'Moradia') targetAmount = 4500;
      if (cat.name === 'Transporte') targetAmount = 1800;

      await prisma.budget.create({
        data: {
          familyId: family.id,
          userId: user.id,
          categoryId: cat.id,
          periodMonth,
          targetAmount,
          alertPercentage: 80,
        },
      });
      totalBudgets++;
    }
  }

  return {
    goalsCount: createdGoals.length,
    depositsCount: totalDeposits,
    budgetsCount: totalBudgets,
  };
}

export async function generateMassTransactions(
  base: Awaited<ReturnType<typeof createBaseEntities>>,
  targetCount = 30000,
  batchSize = 5000,
) {
  console.log(`📦 Gerando ${targetCount} transações massivas para testes de performance...`);
  const { perfUser, perfFamily, people, accounts, cards, invoices, categories } = base;

  // Mapa rápido de faturas por cartão e mês de referência
  const invoiceMap = new Map<string, string>();
  for (const inv of invoices) {
    invoiceMap.set(`${inv.creditCardId}_${inv.referenceMonth}`, inv.id);
  }

  const expenseCategories = categories.filter((c) => c.type === TransactionType.EXPENSE);
  const incomeCategories = categories.filter((c) => c.type === TransactionType.INCOME);

  // Amostras de descrições realistas
  const expenseDescriptions: Record<string, string[]> = {
    Alimentação: [
      'Supermercado Pão de Açúcar',
      'Feira Orgânica Semanal',
      'Restaurante Família & Cia',
      'Padaria Bella Manhã',
      'Hortifruti Natural da Terra',
      'iFood Jantar Delivery',
      'Açougue Boi Nobre',
      'Cafeteria Santo Grão',
    ],
    Moradia: [
      'Condomínio Residencial Parque',
      'Conta de Energia Elétrica Enel',
      'Companhia de Água e Saneamento',
      'Internet Fibra 500Mb',
      'Manutenção Hidráulica e Elétrica',
      'Produtos de Limpeza Lar Doce Lar',
    ],
    Transporte: [
      'Posto Ipiranga Combustível',
      'Posto Shell V-Power',
      'Recarga Sem Parar / ConectCar',
      'Uber Viagem Urbana',
      'Estacionamento Shopping',
      'Manutenção e Troca de Óleo',
    ],
    Saúde: [
      'Farmácia Droga Raia',
      'Drogasil Medicamentos',
      'Consulta Médica Especialista',
      'Exames Laboratoriais Fleury',
      'Odontologia Preventiva',
    ],
    Educação: [
      'Mensalidade Escolar / Colégio',
      'Curso de Inglês Online',
      'Material Escolar e Livros',
      'Assinatura Plataforma de Cursos',
    ],
    'Lazer & Cultura': [
      'Ingressos Cinema IMAX',
      'Show e Teatro Municipal',
      'Parque Temático Família',
      'Livraria Cultura Livros',
    ],
    Vestuário: [
      'Roupas Infantil e Adulto',
      'Calçados Esportivos',
      'Loja de Departamentos Moda',
    ],
    'Assinaturas & Serviços': [
      'Netflix Premium 4K',
      'Spotify Family',
      'Amazon Prime Anual',
      'Apple iCloud 2TB',
      'YouTube Premium Família',
    ],
    'Outras Despesas': [
      'Presente de Aniversário',
      'Veterinário e Pet Shop',
      'Despesas Diversas Imprevistas',
    ],
  };

  const incomeDescriptions = [
    'Salário Mensal Corporativo',
    'Adiantamento Quinzenal Salário',
    'Dividendos e Rendimentos FIIs',
    'Rendimento CDB e Tesouro Direto',
    'Consultoria e Freelance Dev',
    'Bonificação Semestral Metas',
    'Reembolso de Despesas Corporativas',
  ];

  const transactionsToInsert: Prisma.TransactionCreateManyInput[] = [];
  const now = new Date();
  const twoYearsAgoMs = now.getTime() - 24 * 30.4375 * 24 * 60 * 60 * 1000;

  // Gerador determinístico pseudo-randômico simples para dados consistentes
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const pickRandom = <T>(arr: T[]): T => arr[Math.floor(pseudoRandom() * arr.length)];
  const randomBetween = (min: number, max: number) => min + pseudoRandom() * (max - min);

  console.log('⏳ Construindo lista de registros em memória...');

  for (let i = 0; i < targetCount; i++) {
    // Data distribuída nos últimos 24 meses
    const txTime = twoYearsAgoMs + pseudoRandom() * (now.getTime() - twoYearsAgoMs);
    const txDate = new Date(txTime);
    const year = txDate.getFullYear();
    const month = String(txDate.getMonth() + 1).padStart(2, '0');
    const day = txDate.getDate();

    // Distribuição de tipos: 75% EXPENSE, 20% INCOME, 5% TRANSFER
    const roll = pseudoRandom();
    let type: TransactionType;
    let category = pickRandom(expenseCategories);
    let description = 'Despesa Variada';
    let amount = Number(randomBetween(15, 650).toFixed(2));
    let accountId: string | null = accounts[0].id;
    let destAccountId: string | null = null;
    let creditCardId: string | null = null;
    let invoiceId: string | null = null;

    if (roll < 0.75) {
      // EXPENSE
      type = TransactionType.EXPENSE;
      category = pickRandom(expenseCategories);
      const catList = expenseDescriptions[category.name] || expenseDescriptions['Outras Despesas'];
      description = pickRandom(catList);

      // Metade das despesas são no cartão de crédito, metade na conta bancária/dinheiro
      if (pseudoRandom() < 0.55) {
        const card = pickRandom(cards);
        creditCardId = card.id;
        accountId = null;

        // Determinar fatura correta baseada no fechamento
        let invMonth = month;
        let invYear = year;
        if (day > card.closingDay) {
          const nextMonthDate = new Date(year, txDate.getMonth() + 1, 1);
          invYear = nextMonthDate.getFullYear();
          invMonth = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
        }
        const refKey = `${card.id}_${invYear}-${invMonth}`;
        invoiceId = invoiceMap.get(refKey) || null;
      } else {
        // Conta bancária ou carteira
        accountId = pseudoRandom() < 0.85 ? accounts[0].id : accounts[2].id;
      }
    } else if (roll < 0.95) {
      // INCOME
      type = TransactionType.INCOME;
      category = pickRandom(incomeCategories);
      description = pickRandom(incomeDescriptions);
      amount = Number(randomBetween(250, 8500).toFixed(2));
      accountId = accounts[0].id; // Cai na conta principal
    } else {
      // TRANSFER
      type = TransactionType.TRANSFER;
      category = pickRandom(expenseCategories); // Categoria padrão ou outra
      description = 'Transferência entre Contas (Aporte Investimento / Saque)';
      amount = Number(randomBetween(100, 3000).toFixed(2));
      accountId = accounts[0].id;
      destAccountId = accounts[1].id;
    }

    const person = pickRandom(people);

    transactionsToInsert.push({
      id: randomUUID(),
      userId: perfUser.id,
      familyId: perfFamily.id,
      accountId,
      destinationAccountId: destAccountId,
      creditCardId,
      invoiceId,
      categoryId: category.id,
      personId: person.id,
      type,
      amount: new Prisma.Decimal(amount),
      description,
      notes: null,
      transactionDate: txDate,
      status: TransactionStatus.COMPLETED,
      isPrivate: false,
      createdAt: txDate,
      updatedAt: txDate,
    });
  }

  console.log(`🚀 Inserindo ${transactionsToInsert.length} transações em lotes de ${batchSize}...`);
  const insertStart = Date.now();
  let insertedTotal = 0;

  for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
    const chunk = transactionsToInsert.slice(i, i + batchSize);
    const chunkStart = Date.now();
    await prisma.transaction.createMany({
      data: chunk,
    });
    insertedTotal += chunk.length;
    const chunkElapsed = Date.now() - chunkStart;
    console.log(
      `   Lote [${insertedTotal}/${transactionsToInsert.length}] inserido em ${chunkElapsed}ms`,
    );
  }

  const insertDuration = Date.now() - insertStart;
  console.log(
    `✅ ${insertedTotal} transações persistidas com sucesso em ${(insertDuration / 1000).toFixed(2)}s!`,
  );

  return insertedTotal;
}

export async function runFullPerformanceSeed(targetTransactions = 30000): Promise<SeedPerfStats> {
  const fullStart = Date.now();
  console.log('====================================================');
  console.log('   FINANCEIRO FAMILIAR - BENCHMARK DATA SEEDER      ');
  console.log('====================================================');

  await cleanupPerfUser();
  const base = await createBaseEntities();
  const extra = await createGoalsAndBudgets(
    base.perfUser,
    base.perfFamily,
    base.accounts,
    base.categories,
  );
  const totalTx = await generateMassTransactions(base, targetTransactions, 5000);

  const durationMs = Date.now() - fullStart;

  const stats: SeedPerfStats = {
    users: 1,
    families: 1,
    accounts: base.accounts.length,
    creditCards: base.cards.length,
    people: base.people.length,
    invoices: base.invoices.length,
    categories: base.categories.length,
    goals: extra.goalsCount,
    goalDeposits: extra.depositsCount,
    budgets: extra.budgetsCount,
    transactions: totalTx,
    durationMs,
  };

  console.log('\n====================================================');
  console.log('   RESUMO DA CARGA DE PERFORMANCE FINALIZADA        ');
  console.log('====================================================');
  console.log(`⏱️ Tempo total de execução : ${(stats.durationMs / 1000).toFixed(2)}s`);
  console.log(`👤 Usuário de teste criado  : ${base.perfUser.email} (senha: 123456)`);
  console.log(`🏠 Família de teste         : ${base.perfFamily.name}`);
  console.log(`👥 Pessoas vinculadas       : ${stats.people}`);
  console.log(`🏦 Contas bancárias         : ${stats.accounts}`);
  console.log(`💳 Cartões de crédito       : ${stats.creditCards}`);
  console.log(`📄 Faturas geradas (24m)    : ${stats.invoices}`);
  console.log(`🎯 Metas financeiras        : ${stats.goals} (com ${stats.goalDeposits} depósitos)`);
  console.log(`📊 Orçamentos mensais       : ${stats.budgets}`);
  console.log(`💸 TRANSAÇÕES TOTAIS        : ${stats.transactions}`);
  console.log('====================================================\n');

  return stats;
}

async function main() {
  await runFullPerformanceSeed(30000);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Erro fatal durante seed de performance:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
