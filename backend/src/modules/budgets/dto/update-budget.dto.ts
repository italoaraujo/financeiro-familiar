import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBudgetDto {
  @ApiProperty({ example: 1000.00, required: false })
  @IsNumber({}, { message: 'Teto de gastos deve ser numérico' })
  @Min(0.01)
  @IsOptional()
  targetAmount?: number;

  @ApiProperty({ example: 85, required: false })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  alertPercentage?: number;
}
