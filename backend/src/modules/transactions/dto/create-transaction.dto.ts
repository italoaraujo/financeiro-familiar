import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus, TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType, { message: 'Tipo de transação inválido' })
  @IsNotEmpty({ message: 'Tipo de transação é obrigatório' })
  type: TransactionType;

  @ApiProperty({ example: 150.75 })
  @IsNumber({}, { message: 'Valor deve ser numérico' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  amount: number;

  @ApiProperty({ example: 'Compras da semana no mercado' })
  @IsString()
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  description: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString({}, { message: 'Data inválida (formato YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Data é obrigatória' })
  transactionDate: string;

  @ApiProperty({ required: false })
  @IsUUID('4', { message: 'Categoria inválida' })
  @IsNotEmpty({ message: 'Categoria é obrigatória' })
  categoryId: string;

  @ApiProperty({ required: false, description: 'Conta de débito/crédito' })
  @IsUUID('4')
  @IsOptional()
  accountId?: string;

  @ApiProperty({ required: false, description: 'Cartão de crédito para compras em cartão' })
  @IsUUID('4')
  @IsOptional()
  creditCardId?: string;

  @ApiProperty({ required: false, description: 'Conta de destino em caso de transferência' })
  @IsUUID('4')
  @IsOptional()
  destinationAccountId?: string;

  @ApiProperty({ required: false, default: 1, description: 'Número total de parcelas (ex: 3 para 3x)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  totalInstallments?: number;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @ApiProperty({ enum: TransactionStatus, default: TransactionStatus.COMPLETED, required: false })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  familyId?: string;

  @ApiProperty({ required: false, description: 'Pessoa da família responsável pelo lançamento' })
  @IsUUID('4', { message: 'ID da pessoa inválido' })
  @IsOptional()
  personId?: string;
}
