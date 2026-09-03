import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { InvoiceStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCreditCardDto) {
    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId);
    }

    const creditLimit = new Prisma.Decimal(dto.creditLimit);

    const card = await this.prisma.creditCard.create({
      data: {
        userId,
        familyId: dto.familyId || null,
        accountId: dto.accountId || null,
        name: dto.name,
        brand: dto.brand,
        creditLimit,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        color: dto.color,
      },
    });

    // Inicializa fatura do mês atual
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await this.getOrCreateInvoice(card.id, currentMonthStr);

    return card;
  }

  async findAll(userId: string, familyId?: string) {
    if (familyId) {
      await this.verifyFamilyAccess(userId, familyId);
    }

    const cards = await this.prisma.creditCard.findMany({
      where: familyId ? { familyId, isActive: true } : { userId, isActive: true },
      include: {
        invoices: {
          orderBy: { referenceMonth: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcula limite disponível para cada cartão
    return cards.map((card) => {
      const openAmount = card.invoices
        .filter((inv) => inv.status !== InvoiceStatus.PAID)
        .reduce((acc, inv) => acc.add(inv.totalAmount.minus(inv.paidAmount)), new Prisma.Decimal(0));

      const availableLimit = Prisma.Decimal.max(0, card.creditLimit.minus(openAmount));

      return {
        ...card,
        committedAmount: openAmount,
        availableLimit,
      };
    });
  }

  async findById(userId: string, id: string) {
    const card = await this.prisma.creditCard.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { referenceMonth: 'asc' },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Cartão de crédito não encontrado');
    }

    if (card.userId !== userId && card.familyId) {
      await this.verifyFamilyAccess(userId, card.familyId);
    } else if (card.userId !== userId) {
      throw new ForbiddenException('Acesso negado ao cartão');
    }

    const openAmount = card.invoices
      .filter((inv) => inv.status !== InvoiceStatus.PAID)
      .reduce((acc, inv) => acc.add(inv.totalAmount.minus(inv.paidAmount)), new Prisma.Decimal(0));

    const availableLimit = Prisma.Decimal.max(0, card.creditLimit.minus(openAmount));

    return {
      ...card,
      committedAmount: openAmount,
      availableLimit,
    };
  }

  async update(userId: string, id: string, dto: UpdateCreditCardDto) {
    const card = await this.findById(userId, id);

    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId);
    }

    if (dto.creditLimit !== undefined && dto.creditLimit <= 0) {
      throw new BadRequestException('Limite de crédito deve ser maior que zero');
    }

    if (dto.closingDay !== undefined && (dto.closingDay < 1 || dto.closingDay > 31)) {
      throw new BadRequestException('Dia de fechamento deve estar entre 1 e 31');
    }

    if (dto.dueDay !== undefined && (dto.dueDay < 1 || dto.dueDay > 31)) {
      throw new BadRequestException('Dia de vencimento deve estar entre 1 e 31');
    }

    const effectiveClosingDay = dto.closingDay ?? card.closingDay;
    const effectiveDueDay = dto.dueDay ?? card.dueDay;
    const daysChanged =
      (dto.closingDay !== undefined && dto.closingDay !== card.closingDay) ||
      (dto.dueDay !== undefined && dto.dueDay !== card.dueDay);

    await this.prisma.creditCard.update({
      where: { id: card.id },
      data: {
        name: dto.name ?? card.name,
        brand: dto.brand !== undefined ? dto.brand : card.brand,
        creditLimit: dto.creditLimit !== undefined ? new Prisma.Decimal(dto.creditLimit) : card.creditLimit,
        closingDay: effectiveClosingDay,
        dueDay: effectiveDueDay,
        color: dto.color !== undefined ? dto.color : card.color,
        accountId: dto.accountId !== undefined ? dto.accountId : card.accountId,
        familyId: dto.familyId !== undefined ? dto.familyId : card.familyId,
        isActive: dto.isActive !== undefined ? dto.isActive : card.isActive,
      },
    });

    if (daysChanged) {
      const openInvoices = await this.prisma.creditCardInvoice.findMany({
        where: {
          creditCardId: card.id,
          status: InvoiceStatus.OPEN,
        },
      });

      for (const inv of openInvoices) {
        const [year, month] = inv.referenceMonth.split('-').map(Number);
        const closingDate = new Date(year, month - 1, Math.min(effectiveClosingDay, 28));
        const dueMonth = effectiveDueDay < effectiveClosingDay ? month : month - 1;
        const dueYear = effectiveDueDay < effectiveClosingDay && month === 12 ? year + 1 : year;
        const dueDate = new Date(dueYear, dueMonth, Math.min(effectiveDueDay, 28));

        await this.prisma.creditCardInvoice.update({
          where: { id: inv.id },
          data: {
            closingDate,
            dueDate,
          },
        });
      }
    }

    return this.findById(userId, id);
  }

  async getOrCreateInvoice(creditCardId: string, referenceMonth: string) {
    let invoice = await this.prisma.creditCardInvoice.findUnique({
      where: {
        creditCardId_referenceMonth: {
          creditCardId,
          referenceMonth,
        },
      },
    });

    if (!invoice) {
      const card = await this.prisma.creditCard.findUnique({
        where: { id: creditCardId },
      });

      if (!card) {
        throw new NotFoundException('Cartão não encontrado para gerar fatura');
      }

      const [year, month] = referenceMonth.split('-').map(Number);
      const closingDate = new Date(year, month - 1, Math.min(card.closingDay, 28));
      const dueMonth = card.dueDay < card.closingDay ? month : month - 1;
      const dueYear = card.dueDay < card.closingDay && month === 12 ? year + 1 : year;
      const dueDate = new Date(dueYear, dueMonth, Math.min(card.dueDay, 28));

      invoice = await this.prisma.creditCardInvoice.create({
        data: {
          creditCardId,
          referenceMonth,
          closingDate,
          dueDate,
          status: InvoiceStatus.OPEN,
          totalAmount: new Prisma.Decimal(0),
          paidAmount: new Prisma.Decimal(0),
        },
      });
    }

    return invoice;
  }

  async determineInvoiceForDate(creditCardId: string, transactionDate: Date) {
    const card = await this.prisma.creditCard.findUnique({
      where: { id: creditCardId },
    });

    if (!card) {
      throw new NotFoundException('Cartão de crédito não encontrado');
    }

    const tDate = new Date(transactionDate);
    const day = tDate.getDate();
    let month = tDate.getMonth() + 1;
    let year = tDate.getFullYear();

    // Se o dia da compra for após o dia de fechamento, entra na fatura do mês seguinte
    if (day > card.closingDay) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    const refMonth = `${year}-${String(month).padStart(2, '0')}`;
    return this.getOrCreateInvoice(creditCardId, refMonth);
  }

  async payInvoice(userId: string, invoiceId: string, dto: PayInvoiceDto) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.creditCardInvoice.findUnique({
        where: { id: invoiceId },
        include: { creditCard: true },
      });

      if (!invoice) {
        throw new NotFoundException('Fatura não encontrada');
      }

      if (invoice.creditCard.userId !== userId && invoice.creditCard.familyId) {
        await this.verifyFamilyAccess(userId, invoice.creditCard.familyId);
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('Esta fatura já foi totalmente paga');
      }

      const paymentAccount = await tx.account.findUnique({
        where: { id: dto.accountId },
      });

      if (!paymentAccount) {
        throw new NotFoundException('Conta bancária de pagamento não encontrada');
      }

      const amountToPay = dto.amount
        ? new Prisma.Decimal(dto.amount)
        : invoice.totalAmount.minus(invoice.paidAmount);

      if (amountToPay.lte(0)) {
        throw new BadRequestException('Valor do pagamento deve ser maior que zero');
      }

      const newPaidAmount = invoice.paidAmount.add(amountToPay);
      const isFullPayment = newPaidAmount.gte(invoice.totalAmount);

      // Atualiza status da fatura
      const updatedInvoice = await tx.creditCardInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          status: isFullPayment ? InvoiceStatus.PAID : InvoiceStatus.OPEN,
          paidAt: isFullPayment ? new Date() : null,
        },
      });

      // Busca ou cria categoria padrão de pagamento de fatura
      let invoiceCat = await tx.category.findFirst({
        where: { name: 'Pagamento de Fatura' },
      });

      if (!invoiceCat) {
        invoiceCat = await tx.category.create({
          data: {
            name: 'Pagamento de Fatura',
            type: TransactionType.EXPENSE,
            icon: 'CreditCard',
            color: '#6366f1',
            isSystemDefault: true,
          },
        });
      }

      // Cria a despesa na conta bancária
      await tx.transaction.create({
        data: {
          userId,
          familyId: invoice.creditCard.familyId,
          accountId: paymentAccount.id,
          categoryId: invoiceCat.id,
          type: TransactionType.EXPENSE,
          amount: amountToPay,
          description: `Pagamento de Fatura ${invoice.creditCard.name} (${invoice.referenceMonth})`,
          transactionDate: new Date(),
          status: TransactionStatus.COMPLETED,
        },
      });

      // Debita do saldo da conta bancária
      await tx.account.update({
        where: { id: paymentAccount.id },
        data: {
          currentBalance: {
            decrement: amountToPay,
          },
        },
      });

      return updatedInvoice;
    });
  }

  async getInvoiceDetails(userId: string, invoiceId: string) {
    const invoice = await this.prisma.creditCardInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        creditCard: true,
        transactions: {
          include: {
            category: true,
            person: {
              select: { id: true, name: true, color: true, avatarUrl: true },
            },
          },
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Fatura não encontrada');
    }

    if (invoice.creditCard.userId !== userId && invoice.creditCard.familyId) {
      await this.verifyFamilyAccess(userId, invoice.creditCard.familyId);
    } else if (invoice.creditCard.userId !== userId) {
      throw new ForbiddenException('Acesso negado à fatura');
    }

    const breakdownMap = new Map<string, {
      personId: string | null;
      name: string;
      color: string;
      totalAmount: Prisma.Decimal;
      count: number;
    }>();

    for (const tx of invoice.transactions) {
      const key = tx.personId || 'unassigned';
      const current = breakdownMap.get(key) || {
        personId: tx.personId,
        name: tx.person?.name || 'Titular / Não atribuído',
        color: tx.person?.color || '#64748b',
        totalAmount: new Prisma.Decimal(0),
        count: 0,
      };

      current.totalAmount = current.totalAmount.add(tx.amount);
      current.count += 1;
      breakdownMap.set(key, current);
    }

    const personBreakdown = Array.from(breakdownMap.values()).map((item) => ({
      ...item,
      totalAmount: item.totalAmount.toNumber(),
    }));

    return {
      ...invoice,
      personBreakdown,
    };
  }

  private async verifyFamilyAccess(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Acesso negado à família especificada');
    }
  }
}
