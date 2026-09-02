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
}
