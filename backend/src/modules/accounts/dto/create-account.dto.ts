import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({ example: 'Nubank Conta Corrente' })
  @IsString()
  @IsNotEmpty({ message: 'Nome da conta é obrigatório' })
  name: string;

  @ApiProperty({ enum: AccountType, default: AccountType.CHECKING })
  @IsEnum(AccountType, { message: 'Tipo de conta inválido' })
  @IsNotEmpty({ message: 'Tipo de conta é obrigatório' })
  type: AccountType;

  @ApiProperty({ example: 1000.00, default: 0.00 })
  @IsNumber({}, { message: 'Saldo inicial deve ser numérico' })
  @IsOptional()
  initialBalance?: number;

  @ApiProperty({ example: 'BRL', default: 'BRL' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: '#8b5cf6', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'Wallet', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: 'uuid-da-familia', required: false })
  @IsUUID('4', { message: 'ID da família deve ser um UUID válido' })
  @IsOptional()
  familyId?: string;
}
