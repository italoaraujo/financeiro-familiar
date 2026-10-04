import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Mercado e Feira', required: false, maxLength: 100 })
  @IsString()
  @MaxLength(100, { message: 'Nome da categoria não pode exceder 100 caracteres' })
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Apple', required: false, maxLength: 50 })
  @IsString()
  @MaxLength(50, { message: 'Ícone não pode exceder 50 caracteres' })
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: '#059669', required: false, maxLength: 7 })
  @IsString()
  @MaxLength(7, { message: 'Cor não pode exceder 7 caracteres' })
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  parentId?: string;
}
