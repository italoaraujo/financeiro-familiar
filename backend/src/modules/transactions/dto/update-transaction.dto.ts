import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTransactionDto {
  @ApiProperty({ required: false, example: 'Compras atualizadas no mercado' })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  @IsNotEmpty({ message: 'Descrição não pode ser vazia' })
  @MaxLength(255, { message: 'Descrição não pode exceder 255 caracteres' })
  description?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Tags para categorização transversal',
  })
  @IsOptional()
  @IsArray({ message: 'Tags deve ser uma lista de textos' })
  @IsString({ each: true, message: 'Cada tag deve ser um texto' })
  @MaxLength(50, { each: true, message: 'Cada tag não pode exceder 50 caracteres' })
  tags?: string[];
}
