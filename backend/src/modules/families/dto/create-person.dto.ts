import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePersonDto {
  @ApiProperty({ example: 'Filho Pedro', description: 'Nome da pessoa da família' })
  @IsString({ message: 'Nome deve ser um texto' })
  @IsNotEmpty({ message: 'Nome da pessoa é obrigatório' })
  @Length(2, 100, { message: 'Nome deve ter entre 2 e 100 caracteres' })
  name: string;

  @ApiPropertyOptional({ example: '#3b82f6', description: 'Cor identificadora em formato hexadecimal' })
  @IsOptional()
  @IsString({ message: 'Cor deve ser uma string' })
  color?: string;

  @ApiPropertyOptional({ example: 'https://avatar.url/pedro.png', description: 'URL de avatar opcional' })
  @IsOptional()
  @IsString({ message: 'Avatar deve ser uma URL ou caminho' })
  avatarUrl?: string;
}
