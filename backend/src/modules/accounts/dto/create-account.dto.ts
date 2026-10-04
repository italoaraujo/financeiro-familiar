import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({ example: 'Nubank Conta Corrente', maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: 'Nome da conta é obrigatório' })
  @MaxLength(100, { message: 'Nome da conta não pode exceder 100 caracteres' })
  name: string;

  @ApiProperty({ enum: AccountType, default: AccountType.CHECKING })
  @IsEnum(AccountType, { message: 'Tipo de conta inválido' })
  @IsNotEmpty({ message: 'Tipo de conta é obrigatório' })
  type: AccountType;

  @ApiProperty({ example: 1000.00, default: 0.00 })
  @IsNumber({}, { message: 'Saldo inicial deve ser numérico' })
  @IsOptional()
  initialBalance?: number;

  @ApiProperty({ example: 'BRL', default: 'BRL', maxLength: 3 })
  @IsString()
  @MaxLength(3, { message: 'Moeda não pode exceder 3 caracteres' })
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: '#8b5cf6', required: false, maxLength: 7 })
  @IsString()
  @MaxLength(7, { message: 'Cor não pode exceder 7 caracteres' })
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'Wallet', required: false, maxLength: 50 })
  @IsString()
  @MaxLength(50, { message: 'Ícone não pode exceder 50 caracteres' })
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: 'uuid-da-familia', required: false })
  @IsUUID('4', { message: 'ID da família deve ser um UUID válido' })
  @IsOptional()
  familyId?: string;
}
