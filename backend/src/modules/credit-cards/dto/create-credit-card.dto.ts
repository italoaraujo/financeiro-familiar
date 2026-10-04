import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCreditCardDto {
  @ApiProperty({ example: 'Nubank Ultravioleta', maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: 'Nome do cartão é obrigatório' })
  @MaxLength(100, { message: 'Nome do cartão não pode exceder 100 caracteres' })
  name: string;

  @ApiProperty({ example: 'Mastercard', required: false, maxLength: 50 })
  @IsString()
  @MaxLength(50, { message: 'Bandeira não pode exceder 50 caracteres' })
  @IsOptional()
  brand?: string;

  @ApiProperty({ example: 5000.00 })
  @IsNumber({}, { message: 'Limite de crédito deve ser um número válido' })
  @Min(0, { message: 'Limite não pode ser negativo' })
  creditLimit: number;

  @ApiProperty({ example: 20, minimum: 1, maximum: 31 })
  @IsInt({ message: 'Dia de fechamento deve ser um número inteiro' })
  @Min(1)
  @Max(31)
  closingDay: number;

  @ApiProperty({ example: 27, minimum: 1, maximum: 31 })
  @IsInt({ message: 'Dia de vencimento deve ser um número inteiro' })
  @Min(1)
  @Max(31)
  dueDay: number;

  @ApiProperty({ example: '#8b5cf6', required: false, maxLength: 7 })
  @IsString()
  @MaxLength(7, { message: 'Cor não pode exceder 7 caracteres' })
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false, description: 'Conta bancária associada para débito automático/pagamento' })
  @IsUUID('4')
  @IsOptional()
  accountId?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  familyId?: string;
}
