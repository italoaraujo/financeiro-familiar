import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMcpTokenDto {
  @ApiProperty({
    example: 'Antigravity / Claude Desktop',
    description: 'Nome identificador da integração ou assistente de IA',
    maxLength: 100,
  })
  @IsString({ message: 'Nome do token deve ser um texto' })
  @IsNotEmpty({ message: 'Nome do token é obrigatório' })
  @MaxLength(100, { message: 'Nome do token não pode exceder 100 caracteres' })
  name: string;

  @ApiProperty({
    example: 90,
    default: 90,
    required: false,
    description: 'Validade do token em dias (1 a 365)',
  })
  @Type(() => Number)
  @IsInt({ message: 'Validade em dias deve ser um número inteiro' })
  @Min(1, { message: 'Validade mínima é de 1 dia' })
  @Max(365, { message: 'Validade máxima é de 365 dias' })
  @IsOptional()
  expiresInDays?: number = 90;
}
