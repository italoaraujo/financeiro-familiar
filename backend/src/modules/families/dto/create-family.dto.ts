import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFamilyDto {
  @ApiProperty({ example: 'Família Silva', maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: 'Nome da família é obrigatório' })
  @MaxLength(100, { message: 'Nome da família não pode exceder 100 caracteres' })
  name: string;

  @ApiProperty({ example: 'Finanças compartilhadas do lar', required: false, maxLength: 500 })
  @IsString()
  @MaxLength(500, { message: 'Descrição não pode exceder 500 caracteres' })
  @IsOptional()
  description?: string;
}
