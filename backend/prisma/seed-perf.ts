import {
  PrismaClient,
  TransactionType,
  AccountType,
  InvoiceStatus,
  GoalStatus,
  GoalMovementType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
    
    // Removendo dependências em cascata reversa para integridade referencial
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
      // Data de vencimento normalmente no mês subsequente ou no mesmo mês dependendo do closing/due
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

  // Garantir categorias existentes
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

async function main() {
  const startTime = Date.now();
  console.log('🚀 Iniciando script de preparação de carga de performance...');
  
  await cleanupPerfUser();
  const base = await createBaseEntities();

  const durationMs = Date.now() - startTime;
  console.log(`✨ Entidades base provisionadas em ${(durationMs / 1000).toFixed(2)}s:`);
  console.log(` - Usuário: ${base.perfUser.email}`);
  console.log(` - Família: ${base.perfFamily.name}`);
  console.log(` - Contas: ${base.accounts.length}`);
  console.log(` - Cartões: ${base.cards.length}`);
  console.log(` - Faturas: ${base.invoices.length}`);
  console.log(` - Pessoas: ${base.people.length}`);
  console.log(` - Categorias disponíveis: ${base.categories.length}`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Erro durante o provisionamento base:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
