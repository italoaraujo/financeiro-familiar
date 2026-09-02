import { IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayInvoiceDto {
  @ApiProperty({ description: 'ID da conta bancária de onde o valor será debitado' })
  @IsUUID('4', { message: 'ID da conta bancária inválido' })
  @IsNotEmpty({ message: 'Conta bancária de pagamento é obrigatória' })
  accountId: string;

  @ApiProperty({ example: 1250.50, required: false, description: 'Valor a ser pago. Se omitido, paga o valor total da fatura.' })
  @IsNumber({}, { message: 'Valor deve ser numérico' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @IsOptional()
  amount?: number;
}
