import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTransactionDto } from '../../src/modules/transactions/dto/create-transaction.dto';
import { CreateAccountDto } from '../../src/modules/accounts/dto/create-account.dto';
import { CreateCreditCardDto } from '../../src/modules/credit-cards/dto/create-credit-card.dto';
import { CreateCategoryDto } from '../../src/modules/categories/dto/create-category.dto';
import { CreateFamilyDto } from '../../src/modules/families/dto/create-family.dto';
import { TransactionType, AccountType } from '@prisma/client';

describe('DTO MaxLength Validation (SEC-MED-06)', () => {
  it('should reject CreateTransactionDto when description exceeds 255 chars', async () => {
    const dto = plainToInstance(CreateTransactionDto, {
      type: TransactionType.EXPENSE,
      amount: 100,
      description: 'A'.repeat(256),
      transactionDate: '2026-10-03',
      categoryId: '11111111-1111-1111-1111-111111111111',
    });
    const errors = await validate(dto);
    const descError = errors.find((e) => e.property === 'description');
    expect(descError).toBeDefined();
    expect(descError?.constraints?.maxLength).toBe('Descrição não pode exceder 255 caracteres');
  });

  it('should reject CreateAccountDto when name exceeds 100 chars or currency exceeds 3 chars', async () => {
    const dto = plainToInstance(CreateAccountDto, {
      name: 'A'.repeat(101),
      type: AccountType.CHECKING,
      currency: 'TOOLONG',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
    expect(errors.find((e) => e.property === 'currency')).toBeDefined();
  });

  it('should reject CreateCreditCardDto when name exceeds 100 chars or brand exceeds 50 chars', async () => {
    const dto = plainToInstance(CreateCreditCardDto, {
      name: 'A'.repeat(101),
      brand: 'B'.repeat(51),
      creditLimit: 1000,
      closingDay: 10,
      dueDay: 20,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
    expect(errors.find((e) => e.property === 'brand')).toBeDefined();
  });

  it('should reject CreateCategoryDto when name exceeds 100 chars or icon exceeds 50 chars', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: 'C'.repeat(101),
      icon: 'I'.repeat(51),
      type: TransactionType.EXPENSE,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
    expect(errors.find((e) => e.property === 'icon')).toBeDefined();
  });

  it('should reject CreateFamilyDto when name exceeds 100 chars or description exceeds 500 chars', async () => {
    const dto = plainToInstance(CreateFamilyDto, {
      name: 'F'.repeat(101),
      description: 'D'.repeat(501),
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
    expect(errors.find((e) => e.property === 'description')).toBeDefined();
  });
});
