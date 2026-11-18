import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class GetDescriptionsDto {
  @ApiProperty({
    enum: TransactionType,
    description: 'Tipo da transação (EXPENSE, INCOME, TRANSFER)',
    example: TransactionType.EXPENSE,
  })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional({
    description: 'Termo de busca para filtrar descrições',
    example: 'Super',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'ID da família (se aplicável)',
  })
  @IsUUID('4')
  @IsOptional()
  familyId?: string;

  @ApiPropertyOptional({
    description: 'Quantidade máxima de sugestões (padrão: 10, máximo: 20)',
    default: 10,
    minimum: 1,
    maximum: 20,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
