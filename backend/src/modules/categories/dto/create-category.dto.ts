import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Supermercado' })
  @IsString()
  @IsNotEmpty({ message: 'Nome da categoria é obrigatório' })
  name: string;

  @ApiProperty({ enum: TransactionType, default: TransactionType.EXPENSE })
  @IsEnum(TransactionType, { message: 'Tipo inválido (INCOME ou EXPENSE)' })
  @IsNotEmpty({ message: 'Tipo é obrigatório' })
  type: TransactionType;

  @ApiProperty({ example: 'ShoppingCart', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: '#10b981', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false, description: 'ID da categoria pai para subcategoria' })
  @IsUUID('4')
  @IsOptional()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  familyId?: string;
}
