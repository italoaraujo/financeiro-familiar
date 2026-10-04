import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWithdrawalDto {
  @ApiProperty({ example: 250.00, description: 'Valor a ser resgatado da meta para a conta vinculada' })
  @IsNumber({}, { message: 'Valor do resgate deve ser numérico' })
  @Min(0.01, { message: 'Valor do resgate deve ser maior que zero' })
  amount: number;

  @ApiProperty({ example: '2026-09-04', description: 'Data do resgate (formato YYYY-MM-DD)' })
  @IsDateString({}, { message: 'Data inválida (formato YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Data do resgate é obrigatória' })
  withdrawalDate: string;

  @ApiProperty({ example: 'Resgate para pagar despesa imprevista', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
