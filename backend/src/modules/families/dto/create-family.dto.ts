import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFamilyDto {
  @ApiProperty({ example: 'Família Silva' })
  @IsString()
  @IsNotEmpty({ message: 'Nome da família é obrigatório' })
  name: string;

  @ApiProperty({ example: 'Finanças compartilhadas do lar', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
