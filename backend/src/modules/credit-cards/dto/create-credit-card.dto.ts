import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCreditCardDto {
  @ApiProperty({ example: 'Nubank Ultravioleta' })
  @IsString()
  @IsNotEmpty({ message: 'Nome do cartão é obrigatório' })
  name: string;

  @ApiProperty({ example: 'Mastercard', required: false })
  @IsString()
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

  @ApiProperty({ example: '#8b5cf6', required: false })
  @IsString()
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
