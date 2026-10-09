import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditCardsService } from '../credit-cards/credit-cards.service';
import { TagsService } from '../tags/tags.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransferDto } from './dto/transfer.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import {
  GoalMovementType,
  GoalStatus,
  InvoiceStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
  FamilyMemberRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';

process.env.TZ = process.env.TZ || 'America/Sao_Paulo';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditCardsService: CreditCardsService,
    private readonly tagsService: TagsService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId, true);
    }

    if (dto.personId) {
      const person = await this.prisma.person.findUnique({
        where: { id: dto.personId },
      });
      if (!person) {
        throw new NotFoundException('Pessoa informada não encontrada');
      }
      if (dto.familyId && person.familyId !== dto.familyId) {
        throw new ForbiddenException('A pessoa selecionada não pertence a este grupo familiar');
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category || category.deletedAt) {
        throw new NotFoundException('Categoria informada não encontrada');
      }

      if (!category.isSystemDefault) {
        if (category.familyId) {
          await this.verifyFamilyAccess(userId, category.familyId, true);
          if (dto.familyId && category.familyId !== dto.familyId) {
            throw new ForbiddenException('Acesso negado à categoria informada');
          }
        } else if (category.userId !== userId) {
          throw new ForbiddenException('Acesso negado à categoria informada');
        }
      }
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
    if (totalInstallments > 72) {
      throw new BadRequestException('O parcelamento máximo permitido é de 72 vezes');
    }
    const isInstallment = totalInstallments > 1 && !!dto.creditCardId;
    const baseDate = this.parseTransactionDate(dto.transactionDate, dto.transactionTime);

    return this.prisma.$transaction(async (tx) => {
      let resolvedTags: any[] = [];
      if (dto.tags && dto.tags.length > 0) {
        resolvedTags = await this.tagsService.findOrCreateMany(
          userId,
          dto.familyId,
          dto.tags,
          tx,
        );
      }

      const linkTags = async (transactionId: string) => {
        if (resolvedTags.length > 0) {
          for (const tag of resolvedTags) {
            await tx.transactionTag.create({
              data: {
                transactionId,
                tagId: tag.id,
              },
            });
          }
        }
      };

      // Validação de limite e status do cartão de crédito
      let card: any = null;
      if (dto.creditCardId) {
        card = await tx.creditCard.findUnique({
          where: { id: dto.creditCardId },
          include: {
            invoices: {
              where: { status: { not: InvoiceStatus.PAID } },
            },
          },
        });

        if (!card) {
          throw new NotFoundException('Cartão de crédito não encontrado');
        }

        if (card.userId !== userId && card.familyId) {
          await this.verifyFamilyAccess(userId, card.familyId, true);
        } else if (card.userId !== userId) {
          throw new ForbiddenException('Acesso negado ao cartão de crédito');
        }

        if (!card.isActive) {
          throw new BadRequestException('Não é possível realizar lançamentos em um cartão de crédito inativo');
        }

        const committedAmount = card.invoices.reduce(
          (acc, inv) => acc.add(inv.totalAmount.minus(inv.paidAmount)),
          new Prisma.Decimal(0),
        );

        const availableLimit = Prisma.Decimal.max(0, card.creditLimit.minus(committedAmount));

        if (totalAmount.gt(availableLimit)) {
          throw new BadRequestException(
            `O valor da despesa (R$ ${totalAmount.toFixed(2)}) excede o limite disponível do cartão (R$ ${availableLimit.toFixed(2)})`,
          );
        }
      }

      // Caso 1: Compra parcelada no cartão de crédito
      if (isInstallment) {
        const installmentGroupId = randomUUID();
        const baseInstallmentValue = totalAmount.dividedBy(totalInstallments).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
        let accumulated = baseInstallmentValue.times(totalInstallments - 1);
        const lastInstallmentValue = totalAmount.minus(accumulated);

        const createdTransactions = [];

        const firstInvoice = await this.creditCardsService.determineInvoiceForDate(
          dto.creditCardId!,
          baseDate,
        );
        const refMonthBase =
          firstInvoice?.referenceMonth ||
          `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
        const [firstYear, firstMonth] = refMonthBase.split('-').map(Number);
        const closingDay = card?.closingDay || 1;

        for (let i = 1; i <= totalInstallments; i++) {
          let installmentDate: Date;
          let invoice = firstInvoice;

          if (i === 1) {
            installmentDate = baseDate;
          } else {
            const targetMonth = firstMonth + (i - 1);
            const targetYear = firstYear + Math.floor((targetMonth - 1) / 12);
            const normalizedMonth = ((targetMonth - 1) % 12) + 1;
            const refMonth = `${targetYear}-${String(normalizedMonth).padStart(2, '0')}`;

            if (this.creditCardsService.getOrCreateInvoice) {
              invoice = await this.creditCardsService.getOrCreateInvoice(dto.creditCardId!, refMonth);
            } else {
              invoice = await this.creditCardsService.determineInvoiceForDate(dto.creditCardId!, baseDate);
            }

            if (invoice.status === InvoiceStatus.PAID) {
              throw new BadRequestException(
                `Não é possível gerar a parcela ${i}/${totalInstallments} na fatura ${refMonth} porque ela já foi totalmente paga`,
              );
            }

            const maxDaysInMonth = new Date(targetYear, normalizedMonth, 0).getDate();
            const targetDay = Math.min(closingDay, maxDaysInMonth);
            installmentDate = new Date(targetYear, normalizedMonth - 1, targetDay, 0, 0, 0, 0);
          }

          const instAmount = i === totalInstallments ? lastInstallmentValue : baseInstallmentValue;

          const transaction = await tx.transaction.create({
            data: {
              userId,
              familyId: dto.familyId || null,
              personId: dto.personId || null,
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

          await linkTags(transaction.id);

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
            personId: dto.personId || null,
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

        await linkTags(transaction.id);

        return transaction;
      }

      // Caso 3: Lançamento em conta bancária (Receita ou Despesa)
      const account = await tx.account.findUnique({
        where: { id: dto.accountId },
      });

      if (!account) {
        throw new NotFoundException('Conta bancária não encontrada');
      }

      if (account.userId !== userId && account.familyId) {
        await this.verifyFamilyAccess(userId, account.familyId, true);
      } else if (account.userId !== userId) {
        throw new ForbiddenException('Acesso negado à conta bancária');
      }

      const transaction = await tx.transaction.create({
        data: {
          userId,
          familyId: dto.familyId || null,
          personId: dto.personId || null,
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

      await linkTags(transaction.id);

      return transaction;
    });
  }

  async transfer(userId: string, dto: TransferDto) {
    if (dto.sourceAccountId === dto.destinationAccountId) {
      throw new BadRequestException('A conta de origem e destino não podem ser iguais');
    }

    if (dto.familyId) {
      await this.verifyFamilyAccess(userId, dto.familyId, true);
    }

    const amount = new Prisma.Decimal(dto.amount);
    const date = this.parseTransactionDate(dto.transactionDate, dto.transactionTime);

    return this.prisma.$transaction(async (tx) => {
      const source = await tx.account.findUnique({ where: { id: dto.sourceAccountId } });
      const dest = await tx.account.findUnique({ where: { id: dto.destinationAccountId } });

      if (!source || !dest) {
        throw new NotFoundException('Conta de origem ou destino não encontrada');
      }

      if (source.userId !== userId && source.familyId) {
        await this.verifyFamilyAccess(userId, source.familyId, true);
      } else if (source.userId !== userId) {
        throw new ForbiddenException('Acesso negado à conta bancária de origem');
      }

      if (dest.userId !== userId && dest.familyId) {
        await this.verifyFamilyAccess(userId, dest.familyId, true);
      } else if (dest.userId !== userId) {
        throw new ForbiddenException('Acesso negado à conta bancária de destino');
      }

      const sourceBalance =
        source.currentBalance instanceof Prisma.Decimal
          ? source.currentBalance
          : new Prisma.Decimal(source.currentBalance || 0);

      if (sourceBalance.lt(amount)) {
        throw new BadRequestException(
          `Saldo insuficiente na conta de origem para realizar a transferência. Saldo disponível: R$ ${sourceBalance.toFixed(2)}`,
        );
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

    const where: any = {
      deletedAt: null,
    };

    if (filter.familyId) {
      await this.verifyFamilyAccess(userId, filter.familyId, false);
      where.familyId = filter.familyId;
    } else {
      where.userId = userId;
      where.familyId = null;
    }

    if (filter.startDate || filter.endDate) {
      where.transactionDate = {};
      if (filter.startDate) where.transactionDate.gte = this.parseFilterStartDate(filter.startDate);
      if (filter.endDate) where.transactionDate.lte = this.parseFilterEndDate(filter.endDate);
    }

    if (filter.accountId) where.accountId = filter.accountId;
    if (filter.creditCardId) where.creditCardId = filter.creditCardId;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.personId) where.personId = filter.personId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;

    if (filter.search) {
      where.description = { contains: filter.search, mode: 'insensitive' };
    }

    if (filter.tagId) {
      where.tags = {
        some: {
          OR: [
            { tagId: filter.tagId },
            { tag: { name: { equals: filter.tagId, mode: 'insensitive' } } },
          ],
        },
      };
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
          goalDeposits: {
            select: { id: true, goalId: true },
          },
          person: {
            select: { id: true, name: true, color: true, avatarUrl: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    // Aplica regra de privacidade familiar (RN06):
    // Se isPrivate = true e usuário não é o autor, omite descrição e detalhes
    const sanitized = transactions.map((tx: any) => {
      const flatTags = tx.tags ? tx.tags.map((tt: any) => tt.tag) : [];
      if (tx.isPrivate && tx.userId !== userId) {
        return {
          ...tx,
          description: 'Lançamento Privado',
          notes: null,
          category: { ...tx.category, name: 'Privado' },
          tags: [],
        };
      }
      return {
        ...tx,
        tags: flatTags,
      };
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
        include: {
          category: true,
          goalDeposits: true,
          invoice: true,
        },
      });

      if (!transaction || transaction.deletedAt) {
        throw new NotFoundException('Transação não encontrada');
      }

      if (transaction.userId !== userId) {
        throw new ForbiddenException('Apenas o autor pode excluir o lançamento');
      }

      if (transaction.familyId) {
        await this.verifyFamilyAccess(userId, transaction.familyId, true);
      }

      // Bloqueio de exclusão em faturas de cartão já pagas
      if (transaction.invoice && transaction.invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException(
          'Não é possível excluir lançamentos de faturas que já foram pagas',
        );
      }

      // Bloqueio de exclusão avulsa de movimentações de Metas e Cofrinhos
      if (
        (transaction.goalDeposits && transaction.goalDeposits.length > 0) ||
        transaction.category?.name === 'Aporte em Meta' ||
        transaction.category?.name === 'Resgate de Meta'
      ) {
        throw new BadRequestException(
          'Lançamentos vinculados a Metas e Cofrinhos não podem ser excluídos diretamente pelo extrato. Para movimentar ou retirar valores da sua meta, utilize a operação de Resgate na tela de Metas.'
        );
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

      await tx.transaction.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return { message: 'Transação excluída e saldo estornado com sucesso' };
    });
  }

  private async verifyFamilyAccess(userId: string, familyId: string, isMutation: boolean = false) {
    const member = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Acesso negado ao grupo familiar');
    }

    if (isMutation && member.role === FamilyMemberRole.VIEWER) {
      throw new ForbiddenException(
        'Membros com perfil de apenas visualização não podem realizar alterações',
      );
    }

    return member;
  }

  private parseTransactionDate(
    dateInput: string | Date,
    timeInput?: string,
    defaultHour: number = 12,
  ): Date {
    let year: number;
    let month: number;
    let day: number;
    let hour = defaultHour;
    let minute = 0;
    let second = 0;

    if (typeof dateInput === 'string') {
      const parts = dateInput.split('T');
      const dateParts = parts[0].split('-').map(Number);
      if (dateParts.length === 3 && !isNaN(dateParts[0]) && !isNaN(dateParts[1]) && !isNaN(dateParts[2])) {
        year = dateParts[0];
        month = dateParts[1] - 1;
        day = dateParts[2];
      } else {
        const d = new Date(dateInput);
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
      }

      if (parts[1]) {
        const timeParts = parts[1].split(':').map(Number);
        if (timeParts.length >= 2 && !isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
          hour = timeParts[0];
          minute = timeParts[1];
          second = !isNaN(timeParts[2]) ? Math.floor(timeParts[2]) : 0;
        }
      }
    } else {
      year = dateInput.getFullYear();
      month = dateInput.getMonth();
      day = dateInput.getDate();
      hour = dateInput.getHours();
      minute = dateInput.getMinutes();
      second = dateInput.getSeconds();
    }

    if (timeInput && typeof timeInput === 'string') {
      const timeParts = timeInput.split(':').map(Number);
      if (timeParts.length >= 2 && !isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
        hour = timeParts[0];
        minute = timeParts[1];
        second = 0;
      }
    }

    return new Date(year, month, day, hour, minute, second, 0);
  }

  private parseFilterStartDate(dateStr: string): Date {
    const parts = dateStr.split('T')[0].split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    }
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  private parseFilterEndDate(dateStr: string): Date {
    const parts = dateStr.split('T')[0].split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
    }
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }
}
