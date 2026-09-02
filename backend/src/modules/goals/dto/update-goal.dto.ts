import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GoalStatus } from '@prisma/client';

export class UpdateGoalDto {
  @ApiProperty({ example: 'Reserva de Emergência 2026', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 12000.00, required: false })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  targetAmount?: number;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({ enum: GoalStatus, required: false })
  @IsEnum(GoalStatus)
  @IsOptional()
  status?: GoalStatus;

  @ApiProperty({ example: '#3b82f6', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'Landmark', required: false })
  @IsString()
  @IsOptional()
  icon?: string;
}
