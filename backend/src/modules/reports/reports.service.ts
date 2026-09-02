import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Parser } from 'json2csv';
import { InvoiceStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(userId: string, familyId?: string, periodMonth?: string) {
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId);
    }

    const now = new Date();
    const month = periodMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59);

    const userOrFamilyFilter = familyId ? { familyId } : { userId };

    // 1. Saldo Geral Consolidado
    const accounts = await this.prisma.account.findMany({
      where: {
        ...userOrFamilyFilter,
        isArchived: false,
        isActive: true,
      },
    });

    const totalBalance = accounts.reduce(
      (acc, a) => acc.add(a.currentBalance),
      new Prisma.Decimal(0),
    );

    // 2. Receitas do Mês
    const incomeAgg = await this.prisma.transaction.aggregate({
      where: {
        ...userOrFamilyFilter,
        type: TransactionType.INCOME,
        status: TransactionStatus.COMPLETED,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    const monthlyIncome = incomeAgg._sum.amount || new Prisma.Decimal(0);

    // 3. Despesas do Mês
    const expenseAgg = await this.prisma.transaction.aggregate({
      where: {
        ...userOrFamilyFilter,
        type: TransactionType.EXPENSE,
        status: TransactionStatus.COMPLETED,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    const monthlyExpense = expenseAgg._sum.amount || new Prisma.Decimal(0);

    // 4. Balanço Líquido
    const netBalance = monthlyIncome.minus(monthlyExpense);

    // 5. Faturas Abertas / Próximos Vencimentos
    const openInvoices = await this.prisma.creditCardInvoice.findMany({
      where: {
        status: { in: [InvoiceStatus.OPEN, InvoiceStatus.OVERDUE] },
        creditCard: userOrFamilyFilter,
      },
      include: { creditCard: true },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    // 6. Últimas Transações Recentes
    const recentTransactions = await this.prisma.transaction.findMany({
      where: userOrFamilyFilter,
      include: { category: true, account: true, creditCard: true },
      orderBy: { transactionDate: 'desc' },
      take: 5,
    });

    return {
      periodMonth: month,
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      netBalance,
      openInvoices,
      recentTransactions,
    };
  }

  async getExpensesByCategory(userId: string, familyId?: string, periodMonth?: string) {
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId);
    }

    const now = new Date();
    const month = periodMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59);

    const userOrFamilyFilter = familyId ? { familyId } : { userId };

    const transactions = await this.prisma.transaction.findMany({
      where: {
        ...userOrFamilyFilter,
        type: TransactionType.EXPENSE,
        status: TransactionStatus.COMPLETED,
        transactionDate: { gte: startDate, lte: endDate },
      },
      include: {
        category: true,
      },
    });

    const categoryMap = new Map<string, { id: string; name: string; color: string; total: Prisma.Decimal }>();

    for (const tx of transactions) {
      const cat = tx.category;
      const catId = cat.id;
      const catName = tx.isPrivate && tx.userId !== userId ? 'Privado' : cat.name;
      const catColor = cat.color || '#64748b';

      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          id: catId,
          name: catName,
          color: catColor,
          total: new Prisma.Decimal(0),
        });
      }

      const item = categoryMap.get(catId)!;
      item.total = item.total.add(tx.amount);
    }

    const totalExpense = Array.from(categoryMap.values()).reduce(
      (acc, item) => acc.add(item.total),
      new Prisma.Decimal(0),
    );

    return Array.from(categoryMap.values()).map((item) => ({
      categoryId: item.id,
      name: item.name,
      color: item.color,
      amount: item.total,
      percentage: totalExpense.gt(0)
        ? Number(item.total.dividedBy(totalExpense).times(100).toFixed(1))
        : 0,
    })).sort((a, b) => b.percentage - a.percentage);
  }

  async getCashFlow(userId: string, familyId?: string, monthsCount: number = 6) {
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId);
    }

    const result = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const m = date.getMonth() + 1;
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;

      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 0, 23, 59, 59);

      const userOrFamilyFilter = familyId ? { familyId } : { userId };

      const [incomeAgg, expenseAgg] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: {
            ...userOrFamilyFilter,
            type: TransactionType.INCOME,
            status: TransactionStatus.COMPLETED,
            transactionDate: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            ...userOrFamilyFilter,
            type: TransactionType.EXPENSE,
            status: TransactionStatus.COMPLETED,
            transactionDate: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        }),
      ]);

      const income = incomeAgg._sum.amount || new Prisma.Decimal(0);
      const expense = expenseAgg._sum.amount || new Prisma.Decimal(0);

      result.push({
        month: monthStr,
        income,
        expense,
        net: income.minus(expense),
      });
    }

    return result;
  }

  async exportCsv(userId: string, familyId?: string, startDate?: string, endDate?: string) {
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId);
    }

    const where: any = familyId ? { familyId } : { userId };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
        creditCard: true,
        user: true,
      },
      orderBy: { transactionDate: 'desc' },
    });

    const fields = [
      { label: 'ID', value: 'id' },
      { label: 'Data', value: 'date' },
      { label: 'Tipo', value: 'type' },
      { label: 'Descrição', value: 'description' },
      { label: 'Categoria', value: 'category' },
      { label: 'Conta/Cartão', value: 'paymentSource' },
      { label: 'Valor (R$)', value: 'amount' },
      { label: 'Status', value: 'status' },
      { label: 'Autor', value: 'author' },
      { label: 'Observações', value: 'notes' },
    ];

    const data = transactions.map((t) => {
      const isPrivateHidden = t.isPrivate && t.userId !== userId;
      return {
        id: t.id,
        date: t.transactionDate.toISOString().split('T')[0],
        type: t.type,
        description: isPrivateHidden ? 'Lançamento Privado' : t.description,
        category: isPrivateHidden ? 'Privado' : t.category?.name || '-',
        paymentSource: t.account?.name || t.creditCard?.name || '-',
        amount: Number(t.amount.toString()),
        status: t.status,
        author: t.user.name,
        notes: isPrivateHidden ? '' : t.notes || '',
      };
    });

    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  private async verifyFamilyAccess(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Acesso negado ao grupo familiar');
    }
  }
}
