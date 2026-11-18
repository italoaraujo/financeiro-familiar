import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateTransactionDto } from '../../src/modules/transactions/dto/create-transaction.dto';
import { UpdateTransactionDto } from '../../src/modules/transactions/dto/update-transaction.dto';
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

describe('UpdateTransactionDto Validation & Whitelist (EDITTX-01, EDITTX-02)', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });

  it('should accept valid description and tags (including empty tags array)', async () => {
    const result = await pipe.transform(
      {
        description: 'Supermercado Atualizado',
        tags: ['mercado', 'casa'],
      },
      { type: 'body', metatype: UpdateTransactionDto },
    );

    expect(result).toBeInstanceOf(UpdateTransactionDto);
    expect(result.description).toBe('Supermercado Atualizado');
    expect(result.tags).toEqual(['mercado', 'casa']);

    const emptyTagsResult = await pipe.transform(
      { tags: [] },
      { type: 'body', metatype: UpdateTransactionDto },
    );
    expect(emptyTagsResult.tags).toEqual([]);
  });

  it('should reject empty description, description > 255 chars, or tag > 50 chars', async () => {
    const emptyDescDto = plainToInstance(UpdateTransactionDto, { description: '' });
    const emptyErrors = await validate(emptyDescDto);
    const emptyDescErr = emptyErrors.find((e) => e.property === 'description');
    expect(emptyDescErr).toBeDefined();
    expect(emptyDescErr?.constraints?.isNotEmpty).toBe('Descrição não pode ser vazia');

    const longDescDto = plainToInstance(UpdateTransactionDto, { description: 'A'.repeat(256) });
    const longErrors = await validate(longDescDto);
    const longDescErr = longErrors.find((e) => e.property === 'description');
    expect(longDescErr).toBeDefined();
    expect(longDescErr?.constraints?.maxLength).toBe('Descrição não pode exceder 255 caracteres');

    const longTagDto = plainToInstance(UpdateTransactionDto, { tags: ['T'.repeat(51)] });
    const tagErrors = await validate(longTagDto);
    const tagErr = tagErrors.find((e) => e.property === 'tags');
    expect(tagErr).toBeDefined();
    expect(tagErr?.constraints?.maxLength).toBe('Cada tag não pode exceder 50 caracteres');
  });

  it('should reject any immutable field with BadRequestException via forbidNonWhitelisted', async () => {
    const forbiddenPayloads = [
      { description: 'OK', amount: 999.99 },
      { description: 'OK', categoryId: '11111111-1111-1111-1111-111111111111' },
      { description: 'OK', accountId: '11111111-1111-1111-1111-111111111111' },
      { description: 'OK', creditCardId: '11111111-1111-1111-1111-111111111111' },
      { description: 'OK', transactionDate: '2026-11-17' },
      { description: 'OK', type: TransactionType.INCOME },
      { description: 'OK', personId: '11111111-1111-1111-1111-111111111111' },
      { description: 'OK', isPrivate: true },
      { description: 'OK', status: 'PENDING' },
      { description: 'OK', totalInstallments: 5 },
    ];

    for (const payload of forbiddenPayloads) {
      await expect(
        pipe.transform(payload, { type: 'body', metatype: UpdateTransactionDto }),
      ).rejects.toThrow(BadRequestException);
    }
  });
});
