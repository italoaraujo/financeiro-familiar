import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ example: 'uuid-da-categoria' })
  @IsUUID('4', { message: 'ID da categoria inválido' })
  @IsNotEmpty({ message: 'Categoria é obrigatória' })
  categoryId: string;

  @ApiProperty({ example: '2026-09' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Mês de referência deve estar no formato YYYY-MM' })
  @IsNotEmpty({ message: 'Mês de referência é obrigatório' })
  periodMonth: string;

  @ApiProperty({ example: 800.00 })
  @IsNumber({}, { message: 'Teto de gastos deve ser numérico' })
  @Min(0.01, { message: 'Teto de gastos deve ser maior que zero' })
  targetAmount: number;

  @ApiProperty({ example: 80, default: 80, required: false })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  alertPercentage?: number = 80;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  familyId?: string;
}
