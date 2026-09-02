import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({ description: 'ID da conta de origem' })
  @IsUUID('4', { message: 'ID da conta de origem inválido' })
  @IsNotEmpty({ message: 'Conta de origem é obrigatória' })
  sourceAccountId: string;

  @ApiProperty({ description: 'ID da conta de destino' })
  @IsUUID('4', { message: 'ID da conta de destino inválido' })
  @IsNotEmpty({ message: 'Conta de destino é obrigatória' })
  destinationAccountId: string;

  @ApiProperty({ example: 350.00 })
  @IsNumber({}, { message: 'Valor deve ser numérico' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  amount: number;

  @ApiProperty({ example: 'Transferência para poupança' })
  @IsString()
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  description: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString({}, { message: 'Data inválida (formato YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Data é obrigatória' })
  transactionDate: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  familyId?: string;
}
