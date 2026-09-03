import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCreditCardDto {
  @ApiProperty({ example: 'Nubank Ultravioleta', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Mastercard', required: false })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ example: 5000.00, required: false })
  @IsNumber({}, { message: 'Limite de crédito deve ser um número válido' })
  @Min(0.01, { message: 'Limite de crédito deve ser maior que zero' })
  @IsOptional()
  creditLimit?: number;

  @ApiProperty({ example: 20, minimum: 1, maximum: 31, required: false })
  @IsInt({ message: 'Dia de fechamento deve ser um número inteiro' })
  @Min(1)
  @Max(31)
  @IsOptional()
  closingDay?: number;

  @ApiProperty({ example: 27, minimum: 1, maximum: 31, required: false })
  @IsInt({ message: 'Dia de vencimento deve ser um número inteiro' })
  @Min(1)
  @Max(31)
  @IsOptional()
  dueDay?: number;

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

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
