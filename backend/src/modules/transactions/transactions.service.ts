import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditCardsService } from '../credit-cards/credit-cards.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransferDto } from './dto/transfer.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditCardsService: CreditCardsService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId);
    }

    if (dto.type === TransactionType.TRANSFER) {
      throw new BadRequestException('Para transferências, utilize o endpoint específico /transactions/transfer');
    }

    // Validação de conta vs cartão
    if (!dto.accountId && !dto.creditCardId) {
      throw new BadRequestException('É necessário informar uma conta bancária ou um cartão de crédito');
    }

    const totalAmount = new Prisma.Decimal(dto.amount);
    const totalInstallments = dto.totalInstallments || 1;
    const isInstallment = totalInstallments > 1 && !!dto.creditCardId;
    const baseDate = new Date(dto.transactionDate);

    return this.prisma.$transaction(async (tx) => {
      // Caso 1: Compra parcelada no cartão de crédito
      if (isInstallment) {
        const installmentGroupId = randomUUID();
        const baseInstallmentValue = totalAmount.dividedBy(totalInstallments).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
        let accumulated = baseInstallmentValue.times(totalInstallments - 1);
        const lastInstallmentValue = totalAmount.minus(accumulated);

        const createdTransactions = [];

        const baseYear = baseDate.getFullYear();
        const baseMonth = baseDate.getMonth();
        const baseDay = baseDate.getDate();

        for (let i = 1; i <= totalInstallments; i++) {
          const targetMonth = baseMonth + (i - 1);
          const targetYear = baseYear + Math.floor(targetMonth / 12);
          const monthIndex = ((targetMonth % 12) + 12) % 12;
          const maxDaysInMonth = new Date(targetYear, monthIndex + 1, 0).getDate();
          const targetDay = Math.min(baseDay, maxDaysInMonth);
          const installmentDate = new Date(
            targetYear,
            monthIndex,
            targetDay,
            baseDate.getHours(),
            baseDate.getMinutes(),
            baseDate.getSeconds(),
          );

          const invoice = await this.creditCardsService.determineInvoiceForDate(
            dto.creditCardId!,
            installmentDate,
          );

          const instAmount = i === totalInstallments ? lastInstallmentValue : baseInstallmentValue;

          const transaction = await tx.transaction.create({
            data: {
              userId,
              familyId: dto.familyId || null,
              creditCardId: dto.creditCardId,
              invoiceId: invoice.id,
              categoryId: dto.categoryId,
              type: TransactionType.EXPENSE,
              amount: instAmount,
              description: `${dto.description} (${i}/${totalInstallments})`,
              notes: dto.notes,
              transactionDate: installmentDate,
              status: dto.status || TransactionStatus.COMPLETED,
              isPrivate: !!dto.isPrivate,
              installmentNumber: i,
              totalInstallments,
              installmentGroupId,
            },
          });

          // Atualiza total da fatura
          await tx.creditCardInvoice.update({
            where: { id: invoice.id },
            data: { totalAmount: { increment: instAmount } },
          });

          createdTransactions.push(transaction);
        }

        return createdTransactions[0];
      }

      // Caso 2: Transação única no cartão de crédito
      if (dto.creditCardId) {
        const invoice = await this.creditCardsService.determineInvoiceForDate(
          dto.creditCardId,
          baseDate,
        );

        const transaction = await tx.transaction.create({
          data: {
            userId,
            familyId: dto.familyId || null,
            creditCardId: dto.creditCardId,
            invoiceId: invoice.id,
            categoryId: dto.categoryId,
            type: TransactionType.EXPENSE,
            amount: totalAmount,
            description: dto.description,
            notes: dto.notes,
            transactionDate: baseDate,
            status: dto.status || TransactionStatus.COMPLETED,
            isPrivate: !!dto.isPrivate,
          },
        });

        // Incrementa fatura
        await tx.creditCardInvoice.update({
          where: { id: invoice.id },
          data: { totalAmount: { increment: totalAmount } },
        });

        return transaction;
      }

      // Caso 3: Lançamento em conta bancária (Receita ou Despesa)
      const account = await tx.account.findUnique({
        where: { id: dto.accountId },
      });

      if (!account) {
        throw new NotFoundException('Conta bancária não encontrada');
      }

      const transaction = await tx.transaction.create({
        data: {
          userId,
          familyId: dto.familyId || null,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          amount: totalAmount,
          description: dto.description,
          notes: dto.notes,
          transactionDate: baseDate,
          status: dto.status || TransactionStatus.COMPLETED,
          isPrivate: !!dto.isPrivate,
        },
      });

      // Atualiza saldo da conta se status = COMPLETED
      if (transaction.status === TransactionStatus.COMPLETED) {
        const balanceChange = dto.type === TransactionType.INCOME ? totalAmount : totalAmount.negated();

        await tx.account.update({
          where: { id: account.id },
          data: {
            currentBalance: {
              increment: balanceChange,
            },
          },
        });
      }

      return transaction;
    });
  }

  async transfer(userId: string, dto: TransferDto) {
    if (dto.sourceAccountId === dto.destinationAccountId) {
      throw new BadRequestException('A conta de origem e destino não podem ser iguais');
    }

    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId);
    }

    const amount = new Prisma.Decimal(dto.amount);
    const date = new Date(dto.transactionDate);

    return this.prisma.$transaction(async (tx) => {
      const source = await tx.account.findUnique({ where: { id: dto.sourceAccountId } });
      const dest = await tx.account.findUnique({ where: { id: dto.destinationAccountId } });

      if (!source || !dest) {
        throw new NotFoundException('Conta de origem ou destino não encontrada');
      }

      // Busca ou cria categoria padrão para Transferência
      let transferCategory = await tx.category.findFirst({
        where: { name: 'Transferência' },
      });

      if (!transferCategory) {
        transferCategory = await tx.category.create({
          data: {
            name: 'Transferência',
            type: TransactionType.TRANSFER,
            icon: 'ArrowLeftRight',
            color: '#3b82f6',
            isSystemDefault: true,
          },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          userId,
          familyId: dto.familyId || null,
          accountId: source.id,
          destinationAccountId: dest.id,
          categoryId: transferCategory.id,
          type: TransactionType.TRANSFER,
          amount,
          description: dto.description,
          transactionDate: date,
          status: TransactionStatus.COMPLETED,
        },
      });

      // Debita da origem e credita no destino atomicamente
      await tx.account.update({
        where: { id: source.id },
        data: { currentBalance: { decrement: amount } },
      });

      await tx.account.update({
        where: { id: dest.id },
        data: { currentBalance: { increment: amount } },
      });

      return transaction;
    });
  }

  async findAll(userId: string, filter: FilterTransactionDto) {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.familyId) {
      await this.verifyFamilyAccess(userId, filter.familyId);
      where.familyId = filter.familyId;
    } else {
      where.userId = userId;
    }

    if (filter.startDate || filter.endDate) {
      where.transactionDate = {};
      if (filter.startDate) where.transactionDate.gte = new Date(filter.startDate);
      if (filter.endDate) where.transactionDate.lte = new Date(filter.endDate);
    }

    if (filter.accountId) where.accountId = filter.accountId;
    if (filter.creditCardId) where.creditCardId = filter.creditCardId;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;

    if (filter.search) {
      where.description = { contains: filter.search, mode: 'insensitive' };
    }

    const [total, transactions] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        include: {
          category: true,
          account: true,
          destinationAccount: true,
          creditCard: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Aplica regra de privacidade familiar (RN06):
    // Se isPrivate = true e usuário não é o autor, omite descrição e detalhes
    const sanitized = transactions.map((tx) => {
      if (tx.isPrivate && tx.userId !== userId) {
        return {
          ...tx,
          description: 'Lançamento Privado',
          notes: null,
          category: { ...tx.category, name: 'Privado' },
        };
      }
      return tx;
    });

    return {
      data: sanitized,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async remove(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      if (transaction.userId !== userId) {
        throw new ForbiddenException('Apenas o autor pode excluir o lançamento');
      }

      // Estorno de saldos se estiver efetivada
      if (transaction.status === TransactionStatus.COMPLETED) {
        if (transaction.type === TransactionType.INCOME && transaction.accountId) {
          await tx.account.update({
            where: { id: transaction.accountId },
            data: { currentBalance: { decrement: transaction.amount } },
          });
        } else if (transaction.type === TransactionType.EXPENSE && transaction.accountId) {
          await tx.account.update({
            where: { id: transaction.accountId },
            data: { currentBalance: { increment: transaction.amount } },
          });
        } else if (transaction.creditCardId && transaction.invoiceId) {
          await tx.creditCardInvoice.update({
            where: { id: transaction.invoiceId },
            data: { totalAmount: { decrement: transaction.amount } },
          });
        } else if (transaction.type === TransactionType.TRANSFER) {
          if (transaction.accountId) {
            await tx.account.update({
              where: { id: transaction.accountId },
              data: { currentBalance: { increment: transaction.amount } },
            });
          }
          if (transaction.destinationAccountId) {
            await tx.account.update({
              where: { id: transaction.destinationAccountId },
              data: { currentBalance: { decrement: transaction.amount } },
            });
          }
        }
      }

      await tx.transaction.delete({
        where: { id },
      });

      return { message: 'Transação excluída e saldo estornado com sucesso' };
    });
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
