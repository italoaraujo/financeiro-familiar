import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGoalDto {
  @ApiProperty({ example: 'Reserva de Emergência' })
  @IsString()
  @IsNotEmpty({ message: 'Nome da meta é obrigatório' })
  name: string;

  @ApiProperty({ example: 10000.00 })
  @IsNumber({}, { message: 'Valor alvo deve ser numérico' })
  @Min(0.01, { message: 'Valor alvo deve ser maior que zero' })
  targetAmount: number;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsDateString({}, { message: 'Data limite deve estar no formato YYYY-MM-DD' })
  @IsOptional()
  deadline?: string;

  @ApiProperty({ example: '#10b981', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'ShieldCheck', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  familyId?: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', description: 'Conta bancária de custódia vinculada à meta' })
  @IsUUID('4', { message: 'Conta bancária de custódia deve ser um UUID válido' })
  @IsNotEmpty({ message: 'Conta bancária de custódia é obrigatória' })
  accountId: string;
}
