import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Supermercado', maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: 'Nome da categoria é obrigatório' })
  @MaxLength(100, { message: 'Nome da categoria não pode exceder 100 caracteres' })
  name: string;

  @ApiProperty({ enum: TransactionType, default: TransactionType.EXPENSE })
  @IsEnum(TransactionType, { message: 'Tipo inválido (INCOME ou EXPENSE)' })
  @IsNotEmpty({ message: 'Tipo é obrigatório' })
  type: TransactionType;

  @ApiProperty({ example: 'ShoppingCart', required: false, maxLength: 50 })
  @IsString()
  @MaxLength(50, { message: 'Ícone não pode exceder 50 caracteres' })
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: '#10b981', required: false, maxLength: 7 })
  @IsString()
  @MaxLength(7, { message: 'Cor não pode exceder 7 caracteres' })
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
