import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransactionStatus, TransactionType } from '@prisma/client';

export class FilterTransactionDto {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  accountId?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  creditCardId?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ enum: TransactionType, required: false })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiProperty({ enum: TransactionStatus, required: false })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  familyId?: string;

  @ApiProperty({ required: false, description: 'Filtrar por pessoa responsável' })
  @IsUUID('4')
  @IsOptional()
  personId?: string;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
