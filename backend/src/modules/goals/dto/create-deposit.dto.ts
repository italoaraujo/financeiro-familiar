import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepositDto {
  @ApiProperty({ example: 500.00 })
  @IsNumber({}, { message: 'Valor do aporte deve ser numérico' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  amount: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString({}, { message: 'Data inválida (formato YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Data do aporte é obrigatória' })
  depositDate: string;

  @ApiProperty({ required: false, description: 'Conta bancária de onde o valor foi aportado' })
  @IsUUID('4')
  @IsOptional()
  accountId?: string;

  @ApiProperty({ example: 'Aporte mensal planejado', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
