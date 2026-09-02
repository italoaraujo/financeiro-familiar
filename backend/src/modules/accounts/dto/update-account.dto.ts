import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';

export class UpdateAccountDto {
  @ApiProperty({ example: 'Itaú Personalité', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: AccountType, required: false })
  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @ApiProperty({ example: '#3b82f6', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'Building2', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false })
  @IsUUID('4')
  @IsOptional()
  familyId?: string;
}
